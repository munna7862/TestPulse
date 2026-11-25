/**
 * Acceptance S-005 AC2-AC5 (planning/slices/S-005-rbac-member-management.md):
 * member role changes, removals, self-leave, RBAC guards, and post-commit domain events.
 */
import crypto from "node:crypto";
import { truncateAll, useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { OrgService } from "../../src/modules/orgs";
import type { JobData, JobName, QueueClient } from "../../src/queues/registry";
import { callAs, createUser, ORIGIN } from "./helpers";

const testDb = useTestDatabase();

interface EnqueuedCall {
  name: JobName;
  data: unknown;
}

function createFakeQueueClient() {
  const enqueued: EnqueuedCall[] = [];
  let shouldFail = false;

  const client: QueueClient = {
    async enqueue<N extends JobName>(name: N, data: JobData<N>): Promise<string> {
      if (shouldFail) throw new Error("Redis unavailable");
      enqueued.push({ name, data });
      return `job_${enqueued.length}`;
    },
    queue() {
      throw new Error("queue() not expected in API enqueue path");
    },
    async close() {
      return undefined;
    },
  };

  return {
    client,
    enqueued,
    setFail(value: boolean) {
      shouldFail = value;
    },
  };
}

let app: FastifyInstance;
let fakeQueue: ReturnType<typeof createFakeQueueClient>;

beforeAll(async () => {
  fakeQueue = createFakeQueueClient();
  app = await buildApp({
    env: loadApiEnv({
      NODE_ENV: "production",
      AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: "1000",
      AUTH_RATE_LIMIT_LOGIN_PER_EMAIL_PER_15_MIN: "1000",
      AUTH_RATE_LIMIT_RECOVERY_PER_HOUR: "1000",
      AUTH_RATE_LIMIT_RECOVERY_PER_EMAIL_PER_HOUR: "1000",
      AUTH_GENERIC_RESPONSE_MIN_MS: "0",
      JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
      APP_URL: ORIGIN,
      WEB_ORIGIN: ORIGIN,
    }),
    db: testDb.db,
    mailer: new TestMailer(),
    logger: false,
    queueClient: fakeQueue.client,
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await truncateAll(testDb.db);
  fakeQueue.enqueued.length = 0;
  fakeQueue.setFail(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function setupOrg(prefix: string) {
  const owner = await createUser(app, testDb.db, `${prefix}-owner@example.com`);
  const admin = await createUser(app, testDb.db, `${prefix}-admin@example.com`);
  const member = await createUser(app, testDb.db, `${prefix}-member@example.com`);
  const viewer = await createUser(app, testDb.db, `${prefix}-viewer@example.com`);
  const outsider = await createUser(app, testDb.db, `${prefix}-outsider@example.com`);

  const res = await callAs(app, owner, "POST", "/api/v1/orgs", { name: `${prefix} Org`, slug: `${prefix}-org` });
  if (res.statusCode !== 201) throw new Error(`org create failed: ${res.statusCode} ${res.body}`);
  const orgId = res.json<{ data: { id: string } }>().data.id;

  await testDb.db.orgMember.createMany({
    data: [
      { orgId, userId: admin.id, role: "ADMIN" },
      { orgId, userId: member.id, role: "MEMBER" },
      { orgId, userId: viewer.id, role: "VIEWER" },
    ],
  });

  return { orgId, owner, admin, member, viewer, outsider };
}

describe("Acceptance S-005 AC3: member role management", () => {
  it("[SC-ORG-014] Admin changes Member to Viewer (enqueuing access_changed) and promotes Viewer without eviction", async () => {
    const { orgId, admin, member, viewer } = await setupOrg("role-happy");

    const downgrade = await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}/members/${member.id}`, {
      role: "VIEWER",
    });
    expect(downgrade.statusCode).toBe(200);
    expect(downgrade.json()).toMatchObject({
      success: true,
      data: { userId: member.id, email: member.email, role: "VIEWER" },
    });
    expect(fakeQueue.enqueued).toEqual([
      {
        name: "member.access_changed",
        data: { orgId, userId: member.id, reason: "role_changed", previousRole: "MEMBER", newRole: "VIEWER" },
      },
    ]);

    fakeQueue.enqueued.length = 0;
    const promote = await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}/members/${viewer.id}`, {
      role: "ADMIN",
    });
    expect(promote.statusCode).toBe(200);
    expect(promote.json()).toMatchObject({ success: true, data: { userId: viewer.id, role: "ADMIN" } });
    expect(fakeQueue.enqueued).toEqual([]);
  });

  it("[SC-ORG-014] [SC-ORG-006] blocks privilege escalation, Owner edits, self-role edits, and cross-tenant targets", async () => {
    const { orgId, owner, admin, member, viewer, outsider } = await setupOrg("role-guard");

    // Member/Viewer cannot change roles (including Member attempting self-promotion)
    for (const actor of [member, viewer]) {
      const res = await callAs(app, actor, "PATCH", `/api/v1/orgs/${orgId}/members/${member.id}`, { role: "ADMIN" });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
    }

    // Cannot grant OWNER via role change
    const grantOwner = await callAs(app, owner, "PATCH", `/api/v1/orgs/${orgId}/members/${admin.id}`, {
      role: "OWNER",
    });
    expect(grantOwner.statusCode).toBe(400);
    expect(grantOwner.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });

    // Admin cannot change Owner's role or own role
    const editOwner = await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}/members/${owner.id}`, {
      role: "MEMBER",
    });
    expect(editOwner.statusCode).toBe(403);
    const editSelf = await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}/members/${admin.id}`, {
      role: "MEMBER",
    });
    expect(editSelf.statusCode).toBe(400);

    // Outsider, non-member UUID, and malformed UUID all return 404
    expect(
      (await callAs(app, outsider, "PATCH", `/api/v1/orgs/${orgId}/members/${member.id}`, { role: "VIEWER" }))
        .statusCode,
    ).toBe(404);
    expect(
      (await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}/members/${crypto.randomUUID()}`, { role: "VIEWER" }))
        .statusCode,
    ).toBe(404);
    expect(
      (await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}/members/not-a-uuid`, { role: "VIEWER" })).statusCode,
    ).toBe(404);
    expect(fakeQueue.enqueued).toEqual([]);
  });

  it("[SC-ORG-014] re-checks caller role at write time when demoted before role change commits", async () => {
    const { orgId, admin, member } = await setupOrg("role-stale");
    const original = Object.getOwnPropertyDescriptor(OrgService.prototype, "changeMemberRole")
      ?.value as OrgService["changeMemberRole"];
    vi.spyOn(OrgService.prototype, "changeMemberRole").mockImplementation(async function (
      this: OrgService,
      ...args: Parameters<OrgService["changeMemberRole"]>
    ) {
      await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "MEMBER" } });
      return original.apply(this, args);
    });

    const res = await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}/members/${member.id}`, { role: "VIEWER" });
    expect(res.statusCode).toBe(403);
    const row = await testDb.db.orgMember.findFirstOrThrow({ where: { orgId, userId: member.id } });
    expect(row.role).toBe("MEMBER");
    expect(fakeQueue.enqueued).toEqual([]);
  });
});

describe("Acceptance S-005 AC4-AC5: member removal, self-leave, and queue resilience", () => {
  it("[SC-ORG-015] Admin removes a member (immediate 404, event enqueued) while non-Admins cannot", async () => {
    const { orgId, owner, admin, member, viewer, outsider } = await setupOrg("rm-happy");

    expect((await callAs(app, member, "DELETE", `/api/v1/orgs/${orgId}/members/${viewer.id}`)).statusCode).toBe(403);
    expect((await callAs(app, viewer, "DELETE", `/api/v1/orgs/${orgId}/members/${member.id}`)).statusCode).toBe(403);
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/members/${owner.id}`)).statusCode).toBe(403);
    expect((await callAs(app, outsider, "DELETE", `/api/v1/orgs/${orgId}/members/${member.id}`)).statusCode).toBe(404);
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/members/bad-id`)).statusCode).toBe(404);

    const removed = await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/members/${member.id}`);
    expect(removed.statusCode).toBe(204);
    expect((await callAs(app, member, "GET", `/api/v1/orgs/${orgId}`)).statusCode).toBe(404);
    expect(fakeQueue.enqueued).toEqual([
      {
        name: "member.access_changed",
        data: { orgId, userId: member.id, reason: "removed", previousRole: "MEMBER", newRole: null },
      },
    ]);
  });

  it("[SC-ORG-015] [SC-ORG-006] non-Owner members can self-leave cleanly while Owner self-leave is rejected", async () => {
    const { orgId, owner, admin, member, viewer } = await setupOrg("leave");

    const ownerLeave = await callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}/members/${owner.id}`);
    expect(ownerLeave.statusCode).toBe(403);
    expect(ownerLeave.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
    expect((await callAs(app, owner, "GET", `/api/v1/orgs/${orgId}`)).statusCode).toBe(200);

    for (const [leaver, role] of [
      [viewer, "VIEWER"],
      [member, "MEMBER"],
      [admin, "ADMIN"],
    ] as const) {
      const res = await callAs(app, leaver, "DELETE", `/api/v1/orgs/${orgId}/members/${leaver.id}`);
      expect(res.statusCode).toBe(204);
      expect((await callAs(app, leaver, "GET", `/api/v1/orgs/${orgId}`)).statusCode).toBe(404);
      expect(fakeQueue.enqueued.pop()).toEqual({
        name: "member.access_changed",
        data: { orgId, userId: leaver.id, reason: "left", previousRole: role, newRole: null },
      });
    }
  });

  it("[SC-ORG-015] logs enqueue failures via app.log.error without failing role downgrade or member removal", async () => {
    const { orgId, admin, member, viewer } = await setupOrg("queue-err");
    const logSpy = vi.spyOn(app.log, "error");
    fakeQueue.setFail(true);

    const downgrade = await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}/members/${member.id}`, {
      role: "VIEWER",
    });
    expect(downgrade.statusCode).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);

    const removed = await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/members/${viewer.id}`);
    expect(removed.statusCode).toBe(204);
    expect(logSpy).toHaveBeenCalledTimes(2);
  });
});
