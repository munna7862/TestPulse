/**
 * Acceptance S-005-review: covers all Round 1 test-auditor gaps:
 * - Concurrent transferOwnership vs removeMember/changeMemberRole & 409 Owner guard
 * - Concurrent double-remove & concurrent self-leave races
 * - Write-time caller demotion on removeMember & write-time deleted org (!liveOrg) 404s
 * - Non-member valid UUID & foreign-org user 404s, NUL byte %00 params
 * - Owner happy paths, ADMIN->MEMBER / ADMIN->VIEWER downgrades, ADMIN->ADMIN no-op
 * - CSRF checks on PATCH/DELETE /orgs/:orgId/members/:userId & tenant check before body validation
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

function createFakeQueueClient() {
  const enqueued: Array<{ name: JobName; data: unknown }> = [];
  let shouldFail = false;

  const client: QueueClient = {
    async enqueue<N extends JobName>(name: N, data: JobData<N>): Promise<string> {
      if (shouldFail) throw new Error("Redis connection closed");
      enqueued.push({ name, data });
      return `job_${enqueued.length}`;
    },
    queue() {
      throw new Error("queue() not expected");
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
  const admin2 = await createUser(app, testDb.db, `${prefix}-admin2@example.com`);
  const member = await createUser(app, testDb.db, `${prefix}-member@example.com`);
  const viewer = await createUser(app, testDb.db, `${prefix}-viewer@example.com`);
  const outsider = await createUser(app, testDb.db, `${prefix}-outsider@example.com`);

  const created = await callAs(app, owner, "POST", "/api/v1/orgs", { name: `${prefix} Org`, slug: `${prefix}-org` });
  if (created.statusCode !== 201) throw new Error(`org create failed: ${created.statusCode} ${created.body}`);
  const orgId = created.json<{ data: { id: string } }>().data.id;

  await testDb.db.orgMember.createMany({
    data: [
      { orgId, userId: admin.id, role: "ADMIN" },
      { orgId, userId: admin2.id, role: "ADMIN" },
      { orgId, userId: member.id, role: "MEMBER" },
      { orgId, userId: viewer.id, role: "VIEWER" },
    ],
  });

  // Ensure outsider also owns a separate org so foreign-org user IDs exist in DB.
  await callAs(app, outsider, "POST", "/api/v1/orgs", { name: `${prefix} Foreign`, slug: `${prefix}-foreign` });

  return { orgId, owner, admin, admin2, member, viewer, outsider };
}

describe("Acceptance S-005-review: concurrency and write-time races", () => {
  it("[SC-ORG-006] [SC-ORG-015] concurrent transferOwnership vs removeMember and changeMemberRole preserves a single Owner", async () => {
    const { orgId, owner, admin, admin2 } = await setupOrg("race-rm-tx");

    const [transferRes, removeRes] = await Promise.all([
      callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/transfer-ownership`, { userId: admin.id }),
      callAs(app, admin2, "DELETE", `/api/v1/orgs/${orgId}/members/${admin.id}`),
    ]);
    expect(await testDb.db.orgMember.findMany({ where: { orgId, role: "OWNER" } })).toHaveLength(1);
    expect([200, 400, 404]).toContain(transferRes.statusCode);
    expect([204, 403, 404, 409]).toContain(removeRes.statusCode);

    const { orgId: org2, owner: owner2, admin: a2, admin2: caller2 } = await setupOrg("race-ch-tx");
    const [tx2, ch2] = await Promise.all([
      callAs(app, owner2, "POST", `/api/v1/orgs/${org2}/transfer-ownership`, { userId: a2.id }),
      callAs(app, caller2, "PATCH", `/api/v1/orgs/${org2}/members/${a2.id}`, { role: "VIEWER" }),
    ]);
    expect(await testDb.db.orgMember.findMany({ where: { orgId: org2, role: "OWNER" } })).toHaveLength(1);
    expect([200, 400]).toContain(tx2.statusCode);
    expect([200, 403, 409]).toContain(ch2.statusCode);
  });

  it("[SC-ORG-006] [SC-ORG-014] conditional role: { not: OWNER } returns 409 when target becomes Owner before update/delete", async () => {
    const { orgId, admin2, member } = await setupOrg("cond-409");

    let promoteOnNextFindFirst = true;
    const raceDb = testDb.db.$extends({
      query: {
        orgMember: {
          async findFirst({ args, query }) {
            const row = await query(args);
            if (promoteOnNextFindFirst && row) {
              promoteOnNextFindFirst = false;
              await testDb.db.orgMember.updateMany({ where: { orgId, userId: member.id }, data: { role: "OWNER" } });
            }
            return row;
          },
        },
      },
    }) as unknown as typeof testDb.db;
    const service = new OrgService(raceDb, fakeQueue.client);

    await expect(
      service.changeMemberRole({ orgId, userId: admin2.id, role: "ADMIN", minRole: "ADMIN" }, member.id, "VIEWER"),
    ).rejects.toMatchObject({ statusCode: 409 });

    // Restore member to MEMBER for delete 409 guard test
    await testDb.db.orgMember.updateMany({ where: { orgId, userId: member.id }, data: { role: "MEMBER" } });
    promoteOnNextFindFirst = true;
    await expect(
      service.removeMember({ orgId, userId: admin2.id, role: "ADMIN", minRole: "ADMIN" }, member.id),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(await testDb.db.orgMember.findFirst({ where: { orgId, userId: member.id } })).toMatchObject({
      role: "OWNER",
    });
    expect(fakeQueue.enqueued).toEqual([]);
  });

  it("[SC-ORG-015] concurrent double-remove and concurrent self-leave emit access_changed exactly once", async () => {
    const { orgId, admin, admin2, member, viewer } = await setupOrg("race-dbl");

    const removals = (
      await Promise.all([
        callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/members/${member.id}`),
        callAs(app, admin2, "DELETE", `/api/v1/orgs/${orgId}/members/${member.id}`),
      ])
    )
      .map((r) => r.statusCode)
      .sort((a, b) => a - b);
    expect(removals[0]).toBe(204);
    expect([404, 409]).toContain(removals[1]);
    expect(fakeQueue.enqueued.filter((e) => (e.data as { userId?: string }).userId === member.id)).toHaveLength(1);

    const leaves = (
      await Promise.all([
        callAs(app, viewer, "DELETE", `/api/v1/orgs/${orgId}/members/${viewer.id}`),
        callAs(app, viewer, "DELETE", `/api/v1/orgs/${orgId}/members/${viewer.id}`),
      ])
    )
      .map((r) => r.statusCode)
      .sort((a, b) => a - b);
    expect(leaves[0]).toBe(204);
    expect([404, 409]).toContain(leaves[1]);
    expect(fakeQueue.enqueued.filter((e) => (e.data as { userId?: string }).userId === viewer.id)).toHaveLength(1);
  });

  it("[SC-ORG-015] re-checks caller role at write time during removeMember and rejects deleted orgs with 404", async () => {
    const { orgId, admin, member } = await setupOrg("stale-rm");

    const origRemove = Object.getOwnPropertyDescriptor(OrgService.prototype, "removeMember")
      ?.value as OrgService["removeMember"];
    vi.spyOn(OrgService.prototype, "removeMember").mockImplementationOnce(async function (
      this: OrgService,
      ...args: Parameters<OrgService["removeMember"]>
    ) {
      await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "MEMBER" } });
      return origRemove.apply(this, args);
    });
    const demotedRes = await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/members/${member.id}`);
    expect(demotedRes.statusCode).toBe(403);
    expect(await testDb.db.orgMember.findFirst({ where: { orgId, userId: member.id } })).not.toBeNull();

    // Soft-delete org between preValidation and write for both changeMemberRole & removeMember
    const { orgId: org2, owner: owner2, member: member2 } = await setupOrg("deleted-tx");
    const origChange = Object.getOwnPropertyDescriptor(OrgService.prototype, "changeMemberRole")
      ?.value as OrgService["changeMemberRole"];
    vi.spyOn(OrgService.prototype, "changeMemberRole").mockImplementationOnce(async function (
      this: OrgService,
      ...args: Parameters<OrgService["changeMemberRole"]>
    ) {
      await testDb.db.organization.update({ where: { id: org2 }, data: { deletedAt: new Date() } });
      return origChange.apply(this, args);
    });
    const deadPatch = await callAs(app, owner2, "PATCH", `/api/v1/orgs/${org2}/members/${member2.id}`, {
      role: "VIEWER",
    });
    expect(deadPatch.statusCode).toBe(404);

    const { orgId: org3, owner: owner3, member: member3 } = await setupOrg("deleted-rm-tx");
    vi.spyOn(OrgService.prototype, "removeMember").mockImplementationOnce(async function (
      this: OrgService,
      ...args: Parameters<OrgService["removeMember"]>
    ) {
      await testDb.db.organization.update({ where: { id: org3 }, data: { deletedAt: new Date() } });
      return origRemove.apply(this, args);
    });
    const deadDelete = await callAs(app, owner3, "DELETE", `/api/v1/orgs/${org3}/members/${member3.id}`);
    expect(deadDelete.statusCode).toBe(404);
  });
});

describe("Acceptance S-005-review: RBAC, CSRF, validation ordering and Owner happy paths", () => {
  it("[SC-ORG-014] [SC-ORG-015] Owner manages roles/removals, handles ADMIN downgrades and same-role no-op cleanly", async () => {
    const { orgId, owner, admin, member, outsider } = await setupOrg("owner-ops");

    // Same-role no-op emits no access_changed event
    const sameRole = await callAs(app, owner, "PATCH", `/api/v1/orgs/${orgId}/members/${admin.id}`, { role: "ADMIN" });
    expect(sameRole.statusCode).toBe(200);
    expect(fakeQueue.enqueued).toEqual([]);

    // ADMIN -> MEMBER and ADMIN -> VIEWER both enqueue role_changed
    const toMember = await callAs(app, owner, "PATCH", `/api/v1/orgs/${orgId}/members/${admin.id}`, {
      role: "MEMBER",
    });
    expect(toMember.statusCode).toBe(200);
    expect(fakeQueue.enqueued.pop()).toEqual({
      name: "member.access_changed",
      data: { orgId, userId: admin.id, reason: "role_changed", previousRole: "ADMIN", newRole: "MEMBER" },
    });

    await callAs(app, owner, "PATCH", `/api/v1/orgs/${orgId}/members/${admin.id}`, { role: "ADMIN" });
    const toViewer = await callAs(app, owner, "PATCH", `/api/v1/orgs/${orgId}/members/${admin.id}`, {
      role: "VIEWER",
    });
    expect(toViewer.statusCode).toBe(200);
    expect(fakeQueue.enqueued.pop()).toEqual({
      name: "member.access_changed",
      data: { orgId, userId: admin.id, reason: "role_changed", previousRole: "ADMIN", newRole: "VIEWER" },
    });

    // Owner removes member cleanly; queue failure still commits DB change
    fakeQueue.setFail(true);
    const ownerRemove = await callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}/members/${member.id}`);
    expect(ownerRemove.statusCode).toBe(204);
    expect(await testDb.db.orgMember.findFirst({ where: { orgId, userId: member.id } })).toBeNull();
    fakeQueue.setFail(false);

    // Valid non-member UUID, foreign-org user ID, and %00 NUL segment return 404
    for (const badTarget of [crypto.randomUUID(), outsider.id, "%00"]) {
      expect(
        (await callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}/members/${badTarget}`)).statusCode,
        `DELETE ${badTarget}`,
      ).toBe(404);
      expect(
        (await callAs(app, owner, "PATCH", `/api/v1/orgs/${orgId}/members/${badTarget}`, { role: "VIEWER" }))
          .statusCode,
        `PATCH ${badTarget}`,
      ).toBe(404);
    }
  });

  it("[SC-AUTH-018] [SC-SEC-001] enforces CSRF and runs tenant/RBAC checks before body validation on member mutations", async () => {
    const { orgId, admin, member, outsider } = await setupOrg("csrf-order");

    // Tenant/RBAC beats body validation (404 / 403, never 400)
    const outsiderBadBody = await callAs(app, outsider, "PATCH", `/api/v1/orgs/${orgId}/members/${member.id}`, {
      role: "INVALID",
    });
    expect(outsiderBadBody.statusCode).toBe(404);

    const memberBadBody = await callAs(app, member, "PATCH", `/api/v1/orgs/${orgId}/members/${member.id}`, {
      role: "OWNER",
    });
    expect(memberBadBody.statusCode).toBe(403);

    // Missing / foreign Origin blocked with 403 on PATCH and DELETE (both admin & self-leave)
    for (const origin of [undefined, "https://evil.example.net"]) {
      const patchRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/orgs/${orgId}/members/${member.id}`,
        cookies: { tp_access: admin.accessToken },
        headers: origin ? { origin } : {},
        payload: { role: "VIEWER" },
      });
      expect(patchRes.statusCode).toBe(403);

      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/orgs/${orgId}/members/${member.id}`,
        cookies: { tp_access: admin.accessToken },
        headers: origin ? { origin } : {},
      });
      expect(delRes.statusCode).toBe(403);

      const leaveRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/orgs/${orgId}/members/${member.id}`,
        cookies: { tp_access: member.accessToken },
        headers: origin ? { origin } : {},
      });
      expect(leaveRes.statusCode).toBe(403);
    }

    expect(await testDb.db.orgMember.findFirst({ where: { orgId, userId: member.id } })).toMatchObject({
      role: "MEMBER",
    });
  });
});
