/**
 * Acceptance S-006-review: closes Round 1 Claims, Security, and Test Auditor findings:
 * - [SC-PLAN-002] Free-tier membersPerOrg limit (2 members + 1 pending invite) + tx-interleaving races
 * - Concurrent resend vs accept(oldToken) invalidation & concurrent softDelete vs accept isolation
 * - Concurrent duplicate-email create race & malformed accept tokens (<16, >256, empty, %00) -> INVALID_TOKEN
 * - onMailError / onEnqueueError resilience & no spurious side effects on 4xx or resend
 * - Write-time caller demotion (403) & write-time deleted org (404) across create/resend/revoke
 * - resend/revoke/create edge cases, already-member 409 rollback, CSRF, rate limit (429), ConsoleMailer
 */
import crypto from "node:crypto";
import { truncateAll, useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { ConsoleMailer, type Mailer, TestMailer } from "../../src/lib/mailer";
import { hashVerificationToken } from "../../src/modules/auth/tokens";
import { InvitationService } from "../../src/modules/invitations/invitations.service";
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

const baseEnv = loadApiEnv({
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
});

let app: FastifyInstance;
let mailer: TestMailer;
let fakeQueue: ReturnType<typeof createFakeQueueClient>;

beforeAll(async () => {
  mailer = new TestMailer();
  fakeQueue = createFakeQueueClient();
  app = await buildApp({
    env: baseEnv,
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

function sentInvitationsTo(email: string) {
  return mailer.getSentEmails().filter((m) => m.type === "invitation" && m.to === email.toLowerCase());
}

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

  const foreignRes = await callAs(app, outsider, "POST", "/api/v1/orgs", {
    name: `${prefix} Foreign`,
    slug: `${prefix}-foreign`,
  });
  const foreignOrgId = foreignRes.json<{ data: { id: string } }>().data.id;

  return { orgId, foreignOrgId, owner, admin, member, outsider };
}

describe("Acceptance S-006-review: quota, concurrency races, resilience, and edge cases", () => {
  it("[SC-PLAN-002] [SC-ORG-010] Free org with 2 members and 1 pending invite rejects 4th invite & serializes create vs accept", async () => {
    const { orgId, owner, member } = await setupOrg("sc-plan-002", "FREE");
    // Drop the 3rd member so 2 live members remain (limit = 3).
    await testDb.db.orgMember.deleteMany({ where: { orgId, userId: member.id } });

    // Create 1 active pending invite -> 2 live + 1 pending = 3 (plan limit reached).
    const first = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "slot3@example.com",
      role: "MEMBER",
    });
    expect(first.statusCode).toBe(201);

    const fourth = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "slot4@example.com",
      role: "MEMBER",
    });
    expect(fourth.statusCode).toBe(403);
    expect(fourth.json()).toMatchObject({
      error: { code: "PLAN_LIMIT_REACHED", details: { limit: 3, current: 3 } },
    });

    // Interleave accept(slot3) and create(slot4): total live + pending must never exceed 3.
    const slot3User = await createUser(app, testDb.db, "slot3@example.com");
    const slot3Token = sentInvitationsTo("slot3@example.com")[0]?.token ?? "";
    expect(slot3Token).not.toBe("");
    const svc = new InvitationService({ db: testDb.db, mailer, env: baseEnv });
    const [acceptRes, createDuringAccept] = await Promise.all([
      svc.accept({ id: slot3User.id, email: slot3User.email }, slot3Token),
      callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
        email: "race-slot4@example.com",
        role: "VIEWER",
      }),
    ]);
    expect(acceptRes.role).toBe("MEMBER");
    expect(createDuringAccept.statusCode).toBe(403);
    expect(await testDb.db.orgMember.count({ where: { orgId } })).toBe(3);
  });

  it("[SC-ORG-011] [SC-ORG-013] concurrent resend vs accept(oldToken) invalidates oldToken; newToken and softDelete race behave safely", async () => {
    const { orgId, owner } = await setupOrg("race-resend", "PRO");
    const invitee = await createUser(app, testDb.db, "rotate-me@example.com");
    const createRes = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: invitee.email,
      role: "VIEWER",
    });
    const invId = createRes.json<{ data: { id: string; expiresAt: string } }>().data.id;
    const prevExpiresAt = new Date(createRes.json<{ data: { expiresAt: string } }>().data.expiresAt).getTime();
    const oldToken = sentInvitationsTo(invitee.email)[0]?.token ?? "";
    expect(oldToken).not.toBe("");

    // Force resend to execute and commit between accept's initial token lookup and Organization FOR UPDATE lock.
    let triggerResendOnce = true;
    const resendClock = new Date(Date.now() + 60 * 60 * 1000);
    const rotSvc = new InvitationService({ db: testDb.db, mailer, env: baseEnv, now: () => resendClock });
    const raceDb = testDb.db.$extends({
      query: {
        invitation: {
          async findFirst({ args, query }) {
            const row = await query(args);
            if (triggerResendOnce && row) {
              triggerResendOnce = false;
              await rotSvc.resend({ orgId, userId: owner.id, role: "OWNER", minRole: "ADMIN" }, owner.email, invId);
            }
            return row;
          },
        },
      },
    }) as unknown as typeof testDb.db;
    const acceptSvc = new InvitationService({ db: raceDb, mailer, env: baseEnv });

    await expect(acceptSvc.accept({ id: invitee.id, email: invitee.email }, oldToken)).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_TOKEN",
    });

    const resentMail = sentInvitationsTo(invitee.email)[1];
    if (!resentMail) throw new Error("expected resent invitation email");
    expect(resentMail.url).toContain(`?token=${encodeURIComponent(resentMail.token)}`);
    const rowAfterResend = await testDb.db.invitation.findUnique({ where: { id: invId } });
    expect(rowAfterResend?.tokenHash).toBe(hashVerificationToken(resentMail.token));
    expect(rowAfterResend?.expiresAt.getTime()).toBeGreaterThan(prevExpiresAt);

    // The newly rotated token succeeds with role VIEWER.
    const okAccept = await callAs(app, invitee, "POST", "/api/v1/invitations/accept", { token: resentMail.token });
    expect(okAccept.statusCode).toBe(200);
    expect(okAccept.json()).toMatchObject({ success: true, data: { id: orgId, role: "VIEWER" } });

    // Interleave softDelete right before accept acquires Organization FOR UPDATE.
    const softInvitee = await createUser(app, testDb.db, "soft-inv@example.com");
    await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: softInvitee.email,
      role: "MEMBER",
    });
    const softToken = sentInvitationsTo(softInvitee.email)[0]?.token ?? "";
    expect(softToken).not.toBe("");
    let triggerDeleteOnce = true;
    const deleteRaceDb = testDb.db.$extends({
      query: {
        invitation: {
          async findFirst({ args, query }) {
            const row = await query(args);
            if (triggerDeleteOnce && row) {
              triggerDeleteOnce = false;
              await testDb.db.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
            }
            return row;
          },
        },
      },
    }) as unknown as typeof testDb.db;
    const softAcceptSvc = new InvitationService({ db: deleteRaceDb, mailer, env: baseEnv });
    await expect(
      softAcceptSvc.accept({ id: softInvitee.id, email: softInvitee.email }, softToken),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_TOKEN",
    });
    expect(await testDb.db.orgMember.count({ where: { orgId, userId: softInvitee.id } })).toBe(0);
  });

  it("[SC-ORG-010] [SC-ORG-013] concurrent duplicate-email create returns [201, 409] & malformed accept tokens return 400 INVALID_TOKEN", async () => {
    const { orgId, admin } = await setupOrg("dup-email", "PRO");
    const [r1, r2] = await Promise.all([
      callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, { email: "Dup@Example.COM", role: "MEMBER" }),
      callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, { email: "dup@example.com", role: "MEMBER" }),
    ]);
    expect([r1.statusCode, r2.statusCode].sort((a, b) => a - b)).toEqual([201, 409]);

    const invitee = await createUser(app, testDb.db, "malformed-checker@example.com");
    for (const badToken of ["", "short", "%00", "a".repeat(257)]) {
      const res = await callAs(app, invitee, "POST", "/api/v1/invitations/accept", { token: badToken });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: { code: "INVALID_TOKEN" } });
    }
  });

  it("[SC-ORG-010] onMailError & onEnqueueError swallow outage errors cleanly without spurious side effects", async () => {
    const { orgId, admin } = await setupOrg("resilience", "PRO");
    const mailErrors: unknown[] = [];
    const enqueueErrors: unknown[] = [];
    const flakyMailer: Mailer = {
      async sendVerificationEmail() {},
      async sendPasswordResetEmail() {},
      async sendInvitationEmail() {
        throw new Error("SMTP unreachable");
      },
    };
    const svc = new InvitationService({
      db: testDb.db,
      mailer: flakyMailer,
      env: baseEnv,
      queueClient: fakeQueue.client,
      onMailError: (err) => mailErrors.push(err),
      onEnqueueError: (err) => enqueueErrors.push(err),
    });

    const created = await svc.create({ orgId, userId: admin.id, role: "ADMIN", minRole: "ADMIN" }, admin.email, {
      email: "flaky@example.com",
      role: "MEMBER",
    });
    expect(mailErrors).toHaveLength(1);
    expect(fakeQueue.enqueued).toHaveLength(1);
    expect(fakeQueue.enqueued[0]).toMatchObject({ name: "member.invited", data: { orgId, invitationId: created.id } });

    // Resend does NOT enqueue member.invited even when queue fails; invokes onMailError on mail error
    fakeQueue.setFail(true);
    await svc.resend({ orgId, userId: admin.id, role: "ADMIN", minRole: "ADMIN" }, admin.email, created.id);
    expect(mailErrors).toHaveLength(2);
    expect(fakeQueue.enqueued).toHaveLength(1);

    // Enqueue failure during create invokes onEnqueueError without failing create
    const okMailer = new TestMailer();
    const svcQueueFail = new InvitationService({
      db: testDb.db,
      mailer: okMailer,
      env: baseEnv,
      queueClient: fakeQueue.client,
      onEnqueueError: (err) => enqueueErrors.push(err),
    });
    const created2 = await svcQueueFail.create(
      { orgId, userId: admin.id, role: "ADMIN", minRole: "ADMIN" },
      admin.email,
      { email: "flaky-queue@example.com", role: "VIEWER" },
    );
    expect(created2.email).toBe("flaky-queue@example.com");
    expect(enqueueErrors).toHaveLength(1);
  });

  it("[SC-ORG-010] write-time caller demotion (403) and deleted org (404) are enforced on create, resend, and revoke", async () => {
    const { orgId, owner, admin } = await setupOrg("demote-tx", "PRO");
    const created = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "pending-demote@example.com",
      role: "MEMBER",
    });
    const invId = created.json<{ data: { id: string } }>().data.id;

    // Simulate admin demoted to MEMBER right as lockOrgAndCheckInviter checks membership.
    let demoteOnce = false;
    const demoteDb = testDb.db.$extends({
      query: {
        orgMember: {
          async count({ args, query }) {
            if (demoteOnce) {
              demoteOnce = false;
              await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "MEMBER" } });
            }
            return query(args);
          },
        },
      },
    }) as unknown as typeof testDb.db;
    const svc = new InvitationService({ db: demoteDb, mailer, env: baseEnv });
    const ctx = { orgId, userId: admin.id, role: "ADMIN" as const, minRole: "ADMIN" as const };

    demoteOnce = true;
    await expect(svc.create(ctx, admin.email, { email: "d1@example.com", role: "MEMBER" })).rejects.toMatchObject({
      statusCode: 403,
    });
    await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "ADMIN" } });
    demoteOnce = true;
    await expect(svc.resend(ctx, admin.email, invId)).rejects.toMatchObject({ statusCode: 403 });
    await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "ADMIN" } });
    demoteOnce = true;
    await expect(svc.revoke(ctx, invId)).rejects.toMatchObject({ statusCode: 403 });

    // Restore admin role, then soft-delete the organization and assert 404 on create/resend/revoke
    await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "ADMIN" } });
    await testDb.db.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
    await expect(svc.create(ctx, admin.email, { email: "d2@example.com", role: "MEMBER" })).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(svc.resend(ctx, admin.email, invId)).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.revoke(ctx, invId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("[SC-ORG-010] [SC-ORG-011] covers resend/revoke edge errors, re-invite after expired/revoked, already-member rollback, ordering & isolation", async () => {
    const { orgId, foreignOrgId, owner, admin, member, outsider } = await setupOrg("edges", "PRO");

    // Seed expired invite and accepted invite
    const expiredInv = await testDb.db.invitation.create({
      data: {
        orgId,
        email: "expired-reinvite@example.com",
        role: "MEMBER",
        tokenHash: hashVerificationToken("expired-tok-0000000001"),
        invitedById: owner.id,
        expiresAt: new Date(Date.now() - 10_000),
      },
    });
    const acceptedInv = await testDb.db.invitation.create({
      data: {
        orgId,
        email: "accepted@example.com",
        role: "MEMBER",
        tokenHash: hashVerificationToken("accepted-tok-000000001"),
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 60_000),
        acceptedAt: new Date(),
      },
    });
    const foreignInvRes = await callAs(app, outsider, "POST", `/api/v1/orgs/${foreignOrgId}/invitations`, {
      email: "foreign-only@example.com",
      role: "MEMBER",
    });
    const foreignInvId = foreignInvRes.json<{ data: { id: string } }>().data.id;

    // Resend error paths: expired -> 409, accepted -> 409, missing/foreign/%00 -> 404
    expect(
      (await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations/${expiredInv.id}/resend`)).statusCode,
    ).toBe(409);
    expect(
      (await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations/${acceptedInv.id}/resend`)).statusCode,
    ).toBe(409);
    expect(
      (await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations/${crypto.randomUUID()}/resend`)).statusCode,
    ).toBe(404);
    expect(
      (await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations/${foreignInvId}/resend`)).statusCode,
    ).toBe(404);
    expect((await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations/%00/resend`)).statusCode).toBe(404);

    // Revoke error paths: accepted -> 409, foreign -> 404, %00 -> 404
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/invitations/${acceptedInv.id}`)).statusCode).toBe(
      409,
    );
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/invitations/${foreignInvId}`)).statusCode).toBe(
      404,
    );
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/invitations/%00`)).statusCode).toBe(404);

    // Re-invite after expired -> 201; duplicate active mixed-case -> 409; revoke & re-invite -> 201
    const reinviteExp = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "expired-reinvite@example.com",
      role: "ADMIN",
    });
    expect(reinviteExp.statusCode).toBe(201);
    const reinviteExpId = reinviteExp.json<{ data: { id: string } }>().data.id;
    const mailBefore409 = mailer.getSentEmails().length;
    const queueBefore409 = fakeQueue.enqueued.length;
    expect(
      (
        await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
          email: "EXPIRED-REINVITE@Example.com",
          role: "MEMBER",
        })
      ).statusCode,
    ).toBe(409);
    expect(mailer.getSentEmails().length).toBe(mailBefore409);
    expect(fakeQueue.enqueued.length).toBe(queueBefore409);
    expect((await callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}/invitations/${reinviteExpId}`)).statusCode).toBe(
      204,
    );
    const reinviteRevoked = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "expired-reinvite@example.com",
      role: "VIEWER",
    });
    expect(reinviteRevoked.statusCode).toBe(201);
    const reinviteRevokedId = reinviteRevoked.json<{ data: { id: string } }>().data.id;
    await testDb.db.invitation.update({
      where: { id: reinviteRevokedId },
      data: { createdAt: new Date(Date.now() - 5_000) },
    });

    // List ordering DESC + cross-org isolation + no token/tokenHash leaked
    const secondPending = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "second@example.com",
      role: "MEMBER",
    });
    expect(secondPending.statusCode).toBe(201);
    const listed = await callAs(app, owner, "GET", `/api/v1/orgs/${orgId}/invitations`);
    expect(listed.statusCode).toBe(200);
    const rows = listed.json<{ data: Array<{ email: string }> }>().data;
    expect(rows.map((r) => r.email)).toEqual(["second@example.com", "expired-reinvite@example.com"]);
    expect(listed.body).not.toContain("token");

    // Already-member defensive 409 rollback on accept (acceptedAt remains null)
    const rawDirect = "direct-already-member-token-001";
    const directInv = await testDb.db.invitation.create({
      data: {
        orgId,
        email: member.email,
        role: "ADMIN",
        tokenHash: hashVerificationToken(rawDirect),
        invitedById: owner.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const alreadyMemberAccept = await callAs(app, member, "POST", "/api/v1/invitations/accept", { token: rawDirect });
    expect(alreadyMemberAccept.statusCode).toBe(409);
    const persisted = await testDb.db.invitation.findUnique({ where: { id: directInv.id } });
    expect(persisted?.acceptedAt).toBeNull();
  });

  it("[SC-SEC-001] [SC-SEC-002] enforces auth, CSRF, tenant-before-body-validation, accept rate limit 429, and ConsoleMailer redaction", async () => {
    const { orgId, member, outsider } = await setupOrg("sec-checks", "PRO");

    // Tenant/membership before body validation on POST /invitations
    expect(
      (
        await callAs(app, outsider, "POST", `/api/v1/orgs/${orgId}/invitations`, {
          email: "not-an-email",
          role: "OWNER",
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await callAs(app, member, "POST", `/api/v1/orgs/${orgId}/invitations`, {
          email: "not-an-email",
          role: "OWNER",
        })
      ).statusCode,
    ).toBe(403);

    // Foreign Origin CSRF checks on accept + all 3 org invitation mutations
    const badOrigin = "https://evil.example.com";
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/invitations/accept",
          headers: { cookie: `tp_access=${outsider.accessToken}`, origin: badOrigin },
          payload: { token: "valid-length-token-123456" },
        })
      ).statusCode,
    ).toBe(403);
    for (const req of [
      {
        method: "POST" as const,
        url: `/api/v1/orgs/${orgId}/invitations`,
        payload: { email: "a@b.com", role: "MEMBER" },
      },
      { method: "POST" as const, url: `/api/v1/orgs/${orgId}/invitations/${crypto.randomUUID()}/resend` },
      { method: "DELETE" as const, url: `/api/v1/orgs/${orgId}/invitations/${crypto.randomUUID()}` },
    ]) {
      expect(
        (
          await app.inject({
            method: req.method,
            url: req.url,
            headers: { cookie: `tp_access=${outsider.accessToken}`, origin: badOrigin },
            ...(req.payload ? { payload: req.payload } : {}),
          })
        ).statusCode,
      ).toBe(403);
    }

    // Unauthenticated accept -> 401
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/invitations/accept",
          headers: { origin: ORIGIN },
          payload: { token: "valid-length-token-123456" },
        })
      ).statusCode,
    ).toBe(401);

    // Per-IP 20/hr rate limit on accept (using dedicated IPs so other tests are unaffected)
    const rateIp = "203.0.113.55";
    for (let i = 0; i < 20; i++) {
      const ok = await app.inject({
        method: "POST",
        url: "/api/v1/invitations/accept",
        remoteAddress: rateIp,
        headers: { cookie: `tp_access=${outsider.accessToken}`, origin: ORIGIN },
        payload: { token: `unknown-rate-token-${String(i).padStart(4, "0")}` },
      });
      expect(ok.statusCode).toBe(400);
    }
    const limited = await app.inject({
      method: "POST",
      url: "/api/v1/invitations/accept",
      remoteAddress: rateIp,
      headers: { cookie: `tp_access=${outsider.accessToken}`, origin: ORIGIN },
      payload: { token: "unknown-rate-token-0020" },
    });
    expect(limited.statusCode).toBe(429);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);

    // Another IP is isolated from rateIp's quota
    const otherIp = await app.inject({
      method: "POST",
      url: "/api/v1/invitations/accept",
      remoteAddress: "203.0.113.56",
      headers: { cookie: `tp_access=${outsider.accessToken}`, origin: ORIGIN },
      payload: { token: "unknown-rate-token-other" },
    });
    expect(otherIp.statusCode).toBe(400);

    // ConsoleMailer secret redaction
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const prodMailer = new ConsoleMailer({ revealSecrets: false });
    await prodMailer.sendInvitationEmail({
      to: "user@example.com",
      inviterName: "Alice",
      orgName: "Acme",
      role: "MEMBER",
      token: "secret-invite-token-xyz",
      acceptUrl: "https://app.example.com/invitations/accept?token=secret-invite-token-xyz",
    });
    expect(infoSpy.mock.calls[0]?.[0]).toContain("link withheld");
    expect(infoSpy.mock.calls[0]?.[0]).not.toContain("secret-invite-token-xyz");

    const devMailer = new ConsoleMailer({ revealSecrets: true });
    await devMailer.sendInvitationEmail({
      to: "user@example.com",
      inviterName: "Alice",
      orgName: "Acme",
      role: "MEMBER",
      token: "secret-invite-token-xyz",
      acceptUrl: "https://app.example.com/invitations/accept?token=secret-invite-token-xyz",
    });
    expect(infoSpy.mock.calls[1]?.[0]).toContain("Accept URL:");
    expect(infoSpy.mock.calls[1]?.[0]).toContain("Token: secret-invite-token-xyz");
  });
});
