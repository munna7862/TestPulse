/**
 * Acceptance S-006 AC1-AC5 (planning/slices/S-006-invitations-api.md):
 * invitation create, list, resend, revoke, quota locks, accept flows, error codes, and security checks.
 */
import crypto from "node:crypto";
import { truncateAll, useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { hashVerificationToken } from "../../src/modules/auth/tokens";
import type { JobData, JobName, QueueClient } from "../../src/queues/registry";
import { callAs, createUser, ORIGIN } from "../orgs/helpers";

const testDb = useTestDatabase();

function createFakeQueueClient() {
  const enqueued: Array<{ name: JobName; data: unknown }> = [];
  let shouldFail = false;

  const client: QueueClient = {
    async enqueue<N extends JobName>(name: N, data: JobData<N>): Promise<string> {
      if (shouldFail) throw new Error("Redis down");
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
let mailer: TestMailer;
let fakeQueue: ReturnType<typeof createFakeQueueClient>;

beforeAll(async () => {
  mailer = new TestMailer();
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
    mailer,
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
  mailer.clear();
  fakeQueue.enqueued.length = 0;
  fakeQueue.setFail(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function setupOrg(prefix: string, planTier: "FREE" | "PRO" = "FREE") {
  const owner = await createUser(app, testDb.db, `${prefix}-owner@example.com`);
  const admin = await createUser(app, testDb.db, `${prefix}-admin@example.com`);
  const member = await createUser(app, testDb.db, `${prefix}-member@example.com`);
  const outsider = await createUser(app, testDb.db, `${prefix}-outsider@example.com`);

  const created = await callAs(app, owner, "POST", "/api/v1/orgs", { name: `${prefix} Org`, slug: `${prefix}-org` });
  if (created.statusCode !== 201) throw new Error(`org create failed: ${created.statusCode} ${created.body}`);
  const orgId = created.json<{ data: { id: string } }>().data.id;

  if (planTier !== "FREE") {
    await testDb.db.organization.update({ where: { id: orgId }, data: { planTier } });
  }
  await testDb.db.orgMember.createMany({
    data: [
      { orgId, userId: admin.id, role: "ADMIN" },
      { orgId, userId: member.id, role: "MEMBER" },
    ],
  });

  return { orgId, owner, admin, member, outsider };
}

describe("Acceptance S-006 AC1 & Plan limits: create invitations", () => {
  it("[SC-ORG-010] Admin invites an email with hashed token, normalized lowercase email, mailer delivery and domain event", async () => {
    const { orgId, admin, member, outsider } = await setupOrg("inv-create", "PRO");

    const res = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "  New.Teammate@Example.COM ",
      role: "MEMBER",
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ success: boolean; data: Record<string, unknown> }>().data;
    expect(body).toMatchObject({
      orgId,
      email: "new.teammate@example.com",
      role: "MEMBER",
      invitedById: admin.id,
      invitedByName: admin.email,
    });
    expect(body).not.toHaveProperty("token");
    expect(body).not.toHaveProperty("tokenHash");

    const sent = mailer.findEmailsTo("new.teammate@example.com");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: "invitation", role: "MEMBER", orgName: "inv-create Org" });
    expect(sent[0]?.url).toContain(sent[0]?.token ?? "");

    const row = await testDb.db.invitation.findFirstOrThrow({ where: { id: String(body.id) } });
    expect(row.email).toBe("new.teammate@example.com");
    expect(row.tokenHash).toBe(hashVerificationToken(sent[0]?.token ?? ""));
    expect(row.tokenHash).not.toBe(sent[0]?.token);

    expect(fakeQueue.enqueued).toEqual([
      {
        name: "member.invited",
        data: { orgId, invitationId: row.id, invitedById: admin.id, role: "MEMBER" },
      },
    ]);

    // Duplicate pending invite, existing member email, OWNER grant, low role, outsider
    expect(
      (
        await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
          email: "new.teammate@example.com",
          role: "VIEWER",
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
          email: member.email,
          role: "VIEWER",
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
          email: "owner@example.com",
          role: "OWNER",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await callAs(app, member, "POST", `/api/v1/orgs/${orgId}/invitations`, {
          email: "low@example.com",
          role: "VIEWER",
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await callAs(app, outsider, "POST", `/api/v1/orgs/${orgId}/invitations`, {
          email: "out@example.com",
          role: "VIEWER",
        })
      ).statusCode,
    ).toBe(404);
  });

  it("[SC-PLAN-001] [SC-ORG-010] enforces membersPerOrg (including active pending invites) safely under concurrency", async () => {
    // FREE org allows 3 total members+pending. Setup creates Owner + Admin + Member = 3 already; drop Member so 1 slot opens.
    const { orgId, owner, admin, member } = await setupOrg("inv-limit", "FREE");
    await testDb.db.orgMember.deleteMany({ where: { orgId, userId: member.id } });

    // Seed one already-expired invite; it must NOT count toward active quota
    await testDb.db.invitation.create({
      data: {
        orgId,
        email: "expired@example.com",
        role: "VIEWER",
        tokenHash: hashVerificationToken("expired-seed-token-000001"),
        invitedById: owner.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    // Race 3 concurrent invites for the 1 remaining slot on Free tier (2 live + 1 slot = limit 3)
    const results = await Promise.all([
      callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, { email: "race1@example.com", role: "MEMBER" }),
      callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, { email: "race2@example.com", role: "MEMBER" }),
      callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, { email: "race3@example.com", role: "MEMBER" }),
    ]);

    const statuses = results.map((r) => r.statusCode).sort((a, b) => a - b);
    expect(statuses).toEqual([201, 403, 403]);
    const blocked = results.find((r) => r.statusCode === 403);
    expect(blocked?.json()).toMatchObject({
      error: { code: "PLAN_LIMIT_REACHED", details: { limit: 3, current: 3 } },
    });

    // Revoking the winning pending invite frees the slot immediately
    const createdId = results.find((r) => r.statusCode === 201)?.json<{ data: { id: string } }>().data.id ?? "";
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/invitations/${createdId}`)).statusCode).toBe(204);
    expect(
      (
        await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
          email: "after-revoke@example.com",
          role: "MEMBER",
        })
      ).statusCode,
    ).toBe(201);
  });
});

describe("Acceptance S-006 AC2: list, resend and revoke pending invitations", () => {
  it("[SC-ORG-010] lists active pending invites only, rotates token on resend, and enforces revoke states", async () => {
    const { orgId, admin, owner } = await setupOrg("inv-mgmt", "PRO");

    const createRes = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "pending@example.com",
      role: "ADMIN",
    });
    expect(createRes.statusCode).toBe(201);
    const invId = createRes.json<{ data: { id: string } }>().data.id;
    const firstToken = mailer.getLastEmail()?.token ?? "";

    // Seed expired, revoked, and accepted invitations to verify GET excludes all of them
    await testDb.db.invitation.createMany({
      data: [
        {
          orgId,
          email: "old-exp@example.com",
          role: "VIEWER",
          tokenHash: hashVerificationToken("seed-exp-token-000001"),
          invitedById: owner.id,
          expiresAt: new Date(Date.now() - 10_000),
        },
        {
          orgId,
          email: "old-rev@example.com",
          role: "VIEWER",
          tokenHash: hashVerificationToken("seed-rev-token-000001"),
          invitedById: owner.id,
          expiresAt: new Date(Date.now() + 86_400_000),
          revokedAt: new Date(),
        },
        {
          orgId,
          email: "old-acc@example.com",
          role: "VIEWER",
          tokenHash: hashVerificationToken("seed-acc-token-000001"),
          invitedById: owner.id,
          expiresAt: new Date(Date.now() + 86_400_000),
          acceptedAt: new Date(),
        },
      ],
    });

    const listRes = await callAs(app, admin, "GET", `/api/v1/orgs/${orgId}/invitations`);
    expect(listRes.statusCode).toBe(200);
    const items = listRes.json<{ data: Array<{ id: string; email: string }> }>().data;
    expect(items.map((i) => i.email)).toEqual(["pending@example.com"]);

    // Resend rotates tokenHash (invalidating firstToken) and sends new token
    const resendRes = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations/${invId}/resend`);
    expect(resendRes.statusCode).toBe(200);
    const secondToken = mailer.getLastEmail()?.token ?? "";
    expect(secondToken).not.toBe(firstToken);

    const invitee = await createUser(app, testDb.db, "pending@example.com");
    const staleAccept = await callAs(app, invitee, "POST", "/api/v1/invitations/accept", { token: firstToken });
    expect(staleAccept.statusCode).toBe(400);
    expect(staleAccept.json()).toMatchObject({ error: { code: "INVALID_TOKEN" } });

    // Revoke returns 204; revoking again returns 404; resending revoked returns 409; missing/malformed returns 404
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/invitations/${invId}`)).statusCode).toBe(204);
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/invitations/${invId}`)).statusCode).toBe(404);
    expect((await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations/${invId}/resend`)).statusCode).toBe(
      409,
    );
    expect(
      (await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/invitations/${crypto.randomUUID()}`)).statusCode,
    ).toBe(404);
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/invitations/bad-id`)).statusCode).toBe(404);
  });
});

describe("Acceptance S-006 AC3-AC5: accept invitation flows, permissions, and rejection codes", () => {
  it("[SC-ORG-011] matching verified invitee accepts atomically under concurrency and cannot reuse token", async () => {
    const { orgId, admin } = await setupOrg("inv-acc", "PRO");
    const invitee = await createUser(app, testDb.db, "joiner@example.com");

    await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "Joiner@Example.COM",
      role: "MEMBER",
    });
    const token = mailer.getLastEmail()?.token ?? "";

    // Five concurrent accepts -> exactly one 200, four 409
    const accepts = await Promise.all(
      Array.from({ length: 5 }, () => callAs(app, invitee, "POST", "/api/v1/invitations/accept", { token })),
    );
    expect(accepts.map((r) => r.statusCode).sort((a, b) => a - b)).toEqual([200, 409, 409, 409, 409]);
    const okRes = accepts.find((r) => r.statusCode === 200);
    expect(okRes?.json()).toMatchObject({ success: true, data: { id: orgId, role: "MEMBER" } });
    expect((await callAs(app, invitee, "GET", `/api/v1/orgs/${orgId}`)).statusCode).toBe(200);

    // Token cannot be reused afterwards
    const reuse = await callAs(app, invitee, "POST", "/api/v1/invitations/accept", { token });
    expect(reuse.statusCode).toBe(409);
  });

  it("[SC-ORG-012] [SC-AUTH-019] rejects unverified or wrong-email users with 403 while keeping invite active", async () => {
    const { orgId, admin } = await setupOrg("inv-wrong", "PRO");
    await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "target@example.com",
      role: "ADMIN",
    });
    const token = mailer.getLastEmail()?.token ?? "";

    const unverified = await createUser(app, testDb.db, "unverified@example.com", { verified: false });
    const unverifiedRes = await callAs(app, unverified, "POST", "/api/v1/invitations/accept", { token });
    expect(unverifiedRes.statusCode).toBe(403);
    expect(unverifiedRes.json()).toMatchObject({ error: { code: "EMAIL_NOT_VERIFIED" } });

    const otherUser = await createUser(app, testDb.db, "other@example.com");
    const wrongRes = await callAs(app, otherUser, "POST", "/api/v1/invitations/accept", { token });
    expect(wrongRes.statusCode).toBe(403);
    expect(wrongRes.json()).toMatchObject({ error: { code: "FORBIDDEN" } });

    // Rightful verified invitee can still accept cleanly
    const rightful = await createUser(app, testDb.db, "target@example.com");
    const okRes = await callAs(app, rightful, "POST", "/api/v1/invitations/accept", { token });
    expect(okRes.statusCode).toBe(200);
    expect(okRes.json()).toMatchObject({ data: { id: orgId, role: "ADMIN" } });
  });

  it("[SC-ORG-013] rejects expired, revoked, unknown, soft-deleted org tokens and missing-CSRF accept calls", async () => {
    const { orgId, owner } = await setupOrg("inv-err", "PRO");
    const user = await createUser(app, testDb.db, "err-invitee@example.com");

    // Unknown token -> 400 INVALID_TOKEN
    const unknownRes = await callAs(app, user, "POST", "/api/v1/invitations/accept", {
      token: "a".repeat(64),
    });
    expect(unknownRes.statusCode).toBe(400);
    expect(unknownRes.json()).toMatchObject({ error: { code: "INVALID_TOKEN" } });

    // Expired invitation -> 400 INVITATION_EXPIRED
    const expiredToken = "e".repeat(64);
    await testDb.db.invitation.create({
      data: {
        orgId,
        email: user.email,
        role: "VIEWER",
        tokenHash: hashVerificationToken(expiredToken),
        invitedById: owner.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const expRes = await callAs(app, user, "POST", "/api/v1/invitations/accept", { token: expiredToken });
    expect(expRes.statusCode).toBe(400);
    expect(expRes.json()).toMatchObject({ error: { code: "INVITATION_EXPIRED" } });

    // Revoked invitation -> 400 INVITATION_REVOKED
    const revokedToken = "r".repeat(64);
    await testDb.db.invitation.create({
      data: {
        orgId,
        email: user.email,
        role: "VIEWER",
        tokenHash: hashVerificationToken(revokedToken),
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 86_400_000),
        revokedAt: new Date(),
      },
    });
    const revRes = await callAs(app, user, "POST", "/api/v1/invitations/accept", { token: revokedToken });
    expect(revRes.statusCode).toBe(400);
    expect(revRes.json()).toMatchObject({ error: { code: "INVITATION_REVOKED" } });

    // Missing Origin (CSRF) -> 403
    const csrfRes = await app.inject({
      method: "POST",
      url: "/api/v1/invitations/accept",
      cookies: { tp_access: user.accessToken },
      payload: { token: revokedToken },
    });
    expect(csrfRes.statusCode).toBe(403);

    // Invitation for a soft-deleted org -> 400 INVALID_TOKEN
    const activeToken = "d".repeat(64);
    await testDb.db.invitation.create({
      data: {
        orgId,
        email: user.email,
        role: "MEMBER",
        tokenHash: hashVerificationToken(activeToken),
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await testDb.db.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
    const deletedOrgRes = await callAs(app, user, "POST", "/api/v1/invitations/accept", { token: activeToken });
    expect(deletedOrgRes.statusCode).toBe(400);
    expect(deletedOrgRes.json()).toMatchObject({ error: { code: "INVALID_TOKEN" } });
  });
});
