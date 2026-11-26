/**
 * Acceptance S-008a AC1-AC4 (planning/slices/S-008a-api-keys-api.md):
 * API key creation, hashed storage, prefix listing, immediate revocation,
 * ingest Bearer auth, cross-project & non-ingest isolation, lastUsedAt throttling,
 * and fail-open Redis-style ingest rate limits.
 */
import crypto from "node:crypto";
import sensible from "@fastify/sensible";
import { createTenantDb } from "@testpulse/db";
import { truncateAll, useTestDatabase } from "@testpulse/db/testing";
import { API_KEY_LIVE_PREFIX, type ApiKey, type CreatedApiKey } from "@testpulse/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { LOG_REDACT_PATHS } from "../../src/log-redaction";
import { createAuthMiddleware } from "../../src/modules/auth/auth.middleware";
import { MemoryRateLimitStore, type RateLimitStore } from "../../src/modules/auth/rate-limiter";
import { apiKeyContextOf, createApiKeyAuthHook } from "../../src/plugins/api-key-auth";
import { registerErrorHandling } from "../../src/plugins/error-handler";
import { callAs, createUser, ORIGIN, type TestUser } from "../orgs/helpers";

const testDb = useTestDatabase();
let app: FastifyInstance;

const TEST_ENV = loadApiEnv({
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

beforeAll(async () => {
  app = await buildApp({
    env: TEST_ENV,
    db: testDb.db,
    mailer: new TestMailer(),
    logger: false,
  });
  await app.ready();
});

beforeEach(async () => {
  await truncateAll(testDb.db);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await app.close();
});

async function seedProjectWorkspace() {
  const owner = await createUser(app, testDb.db, "owner@example.com");
  const admin = await createUser(app, testDb.db, "admin@example.com");
  const member = await createUser(app, testDb.db, "member@example.com");
  const viewer = await createUser(app, testDb.db, "viewer@example.com");
  const outsider = await createUser(app, testDb.db, "outsider@example.com");

  const orgRes = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Acme QA", slug: "acme-qa" });
  expect(orgRes.statusCode).toBe(201);
  const orgId = orgRes.json<{ data: { id: string } }>().data.id;

  await testDb.db.orgMember.createMany({
    data: [
      { orgId, userId: admin.id, role: "ADMIN" },
      { orgId, userId: member.id, role: "MEMBER" },
      { orgId, userId: viewer.id, role: "VIEWER" },
    ],
  });

  const projRes = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Core Web" });
  expect(projRes.statusCode).toBe(201);
  const projectAId = projRes.json<{ data: { id: string } }>().data.id;

  const projBRes = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Billing API" });
  expect(projBRes.statusCode).toBe(201);
  const projectBId = projBRes.json<{ data: { id: string } }>().data.id;

  const outOrgRes = await callAs(app, outsider, "POST", "/api/v1/orgs", { name: "Other Org", slug: "other-org" });
  expect(outOrgRes.statusCode).toBe(201);
  const outOrgId = outOrgRes.json<{ data: { id: string } }>().data.id;
  const outProjRes = await callAs(app, outsider, "POST", `/api/v1/orgs/${outOrgId}/projects`, { name: "Foreign App" });
  expect(outProjRes.statusCode).toBe(201);
  const foreignProjectId = outProjRes.json<{ data: { id: string } }>().data.id;

  return { owner, admin, member, viewer, outsider, orgId, projectAId, projectBId, foreignProjectId };
}

function createIngestProbeApp(options?: {
  rateLimitStore?: RateLimitStore;
  perKeyMax?: number;
  perProjectMax?: number;
  windowMs?: number;
  lastUsedThrottleMs?: number;
  now?: () => Date;
}) {
  const probe = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  probe.setValidatorCompiler(validatorCompiler);
  probe.setSerializerCompiler(serializerCompiler);
  void probe.register(sensible);
  registerErrorHandling(probe);

  const auth = createAuthMiddleware(testDb.db, TEST_ENV);
  const authenticateApiKey = createApiKeyAuthHook({
    db: testDb.db,
    rateLimitStore: options?.rateLimitStore ?? new MemoryRateLimitStore(),
    ...(options?.perKeyMax !== undefined ? { perKeyMax: options.perKeyMax } : {}),
    ...(options?.perProjectMax !== undefined ? { perProjectMax: options.perProjectMax } : {}),
    ...(options?.windowMs !== undefined ? { windowMs: options.windowMs } : {}),
    ...(options?.lastUsedThrottleMs !== undefined ? { lastUsedThrottleMs: options.lastUsedThrottleMs } : {}),
    ...(options?.now ? { now: options.now } : {}),
  });

  probe.post("/api/v1/ingest/runs", { preValidation: [authenticateApiKey] }, async (request) => {
    const ctx = apiKeyContextOf(request);
    // Verify the resolved context works with createTenantDb at project scope.
    const apiKeysCount = await createTenantDb(testDb.db, ctx).apiKey.count();
    return {
      success: true,
      data: { orgId: ctx.orgId, projectId: ctx.projectId, apiKeyId: ctx.apiKeyId, apiKeysCount },
    };
  });

  probe.get(
    "/api/v1/ingest/projects/:targetProjectId/probe",
    { preValidation: [authenticateApiKey] },
    async (request) => {
      const ctx = apiKeyContextOf(request);
      const targetProjectId = (request.params as { targetProjectId: string }).targetProjectId;
      // Querying another project through project-scoped tenant db finds nothing -> 404.
      const row = await createTenantDb(testDb.db, ctx).apiKey.findFirst({ where: { projectId: targetProjectId } });
      if (!row) throw probe.httpErrors.notFound("Run not found.");
      return { success: true, data: { ok: true } };
    },
  );

  // Also mount a session-protected REST route to verify API key rejection on non-ingest endpoints.
  probe.get("/api/v1/session-only", { preValidation: [auth.authenticateUser] }, async () => ({
    success: true,
    data: { ok: true },
  }));

  return probe;
}

describe("Acceptance S-008a AC1: API key generation, hash storage & write-time checks", () => {
  it("[SC-KEY-001] Admin creates tp_live_ API key once, DB stores sha256 keyHash + prefix only, validates input & write-time role", async () => {
    const { admin, owner, projectAId } = await seedProjectWorkspace();

    const futureIso = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
    const res = await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, {
      name: "  GitHub Actions  ",
      expiresAt: futureIso,
    });
    expect(res.statusCode).toBe(201);
    const created = res.json<{ success: true; data: CreatedApiKey }>().data;

    expect(created.name).toBe("GitHub Actions");
    expect(created.plaintextKey.startsWith(API_KEY_LIVE_PREFIX)).toBe(true);
    const suffix = created.plaintextKey.slice(API_KEY_LIVE_PREFIX.length);
    expect(suffix).toMatch(/^[0-9A-Za-z]{40,}$/);
    expect(created.prefix).toBe(suffix.slice(0, 8));
    expect(created.status).toBe("ACTIVE");
    expect(created.expiresAt).toBe(futureIso);
    expect(created.revokedAt).toBeNull();
    expect(created.lastUsedAt).toBeNull();
    expect((created as unknown as Record<string, unknown>).keyHash).toBeUndefined();

    const dbRow = await testDb.db.apiKey.findUnique({ where: { id: created.id } });
    expect(dbRow).not.toBeNull();
    const expectedHash = crypto.createHash("sha256").update(created.plaintextKey).digest("hex");
    expect(dbRow?.keyHash).toBe(expectedHash);
    expect(dbRow?.prefix).toBe(created.prefix);

    // Owner can also create a key with no expiry.
    const ownerRes = await callAs(app, owner, "POST", `/api/v1/projects/${projectAId}/api-keys`, { name: "Local Dev" });
    expect(ownerRes.statusCode).toBe(201);
    expect(ownerRes.json<{ data: CreatedApiKey }>().data.expiresAt).toBeNull();

    // Validation errors: blank name, control chars, unknown keys, past expiresAt -> 400.
    for (const payload of [
      { name: "   " },
      { name: "ci\u0000key" },
      { name: "valid", extraField: true },
      { name: "past", expiresAt: new Date(Date.now() - 60_000).toISOString() },
    ]) {
      const bad = await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, payload);
      expect(bad.statusCode).toBe(400);
    }

    // Write-time role re-check: demote admin right when role check runs / after auth -> 403.
    await testDb.db.orgMember.updateMany({ where: { userId: admin.id }, data: { role: "MEMBER" } });
    const demotedRes = await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, {
      name: "Demoted Attempt",
    });
    expect(demotedRes.statusCode).toBe(403);
  });

  it("[SC-KEY-002] [SC-SEC-001] [SC-SEC-002] Member/Viewer get 403; outsiders/missing/malformed/deleted projects get indistinguishable 404 before body validation", async () => {
    const { admin, member, viewer, outsider, projectAId, projectBId, foreignProjectId } = await seedProjectWorkspace();

    for (const lowRole of [member, viewer] as TestUser[]) {
      const createRes = await callAs(app, lowRole, "POST", `/api/v1/projects/${projectAId}/api-keys`, {
        name: "No Access",
      });
      expect(createRes.statusCode).toBe(403);
      expect(createRes.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });

      const listRes = await callAs(app, lowRole, "GET", `/api/v1/projects/${projectAId}/api-keys`);
      expect(listRes.statusCode).toBe(403);
    }

    // Outsider sending invalid body still gets 404 (tenant check runs before body validation).
    expect((await callAs(app, admin, "DELETE", `/api/v1/projects/${projectBId}`)).statusCode).toBe(204);
    const deletedProjId = projectBId;

    const outsiderCases = [
      await callAs(app, outsider, "POST", `/api/v1/projects/${projectAId}/api-keys`, { name: "" }),
      await callAs(app, admin, "POST", `/api/v1/projects/${foreignProjectId}/api-keys`, { name: "" }),
      await callAs(app, admin, "POST", `/api/v1/projects/${crypto.randomUUID()}/api-keys`, { name: "" }),
      await callAs(app, admin, "POST", `/api/v1/projects/not-a-uuid/api-keys`, { name: "" }),
      await callAs(app, admin, "POST", `/api/v1/projects/${deletedProjId}/api-keys`, { name: "" }),
    ];
    const signatures = new Set(
      outsiderCases.map((r) => {
        expect(r.statusCode).toBe(404);
        const body = r.json<{ error: { code: string; message: string } }>();
        return `${body.error.code}:${body.error.message}`;
      }),
    );
    expect(signatures.size).toBe(1);

    // Cookie mutation without Origin fails CSRF with 403.
    const csrfRes = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${projectAId}/api-keys`,
      cookies: { tp_access: admin.accessToken },
      payload: { name: "No Origin" },
    });
    expect(csrfRes.statusCode).toBe(403);
  });
});

describe("Acceptance S-008a AC2: listing, metadata statuses & immediate revocation", () => {
  it("[SC-KEY-003] lists active, expired, and revoked keys with prefix and creator metadata only (no hash or plaintext)", async () => {
    const { admin, projectAId } = await seedProjectWorkspace();

    const aRes = await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, { name: "Active Key" });
    const aKey = aRes.json<{ data: CreatedApiKey }>().data;

    const expRes = await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, {
      name: "Expired Key",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const expKey = expRes.json<{ data: CreatedApiKey }>().data;
    await testDb.db.apiKey.update({
      where: { id: expKey.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const revRes = await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, { name: "Revoked Key" });
    const revKey = revRes.json<{ data: CreatedApiKey }>().data;
    const del = await callAs(app, admin, "DELETE", `/api/v1/projects/${projectAId}/api-keys/${revKey.id}`);
    expect(del.statusCode).toBe(204);

    const listRes = await callAs(app, admin, "GET", `/api/v1/projects/${projectAId}/api-keys`);
    expect(listRes.statusCode).toBe(200);
    const items = listRes.json<{ data: ApiKey[] }>().data;
    expect(items).toHaveLength(3);

    const byName = Object.fromEntries(items.map((item) => [item.name, item]));
    expect(byName["Active Key"]?.status).toBe("ACTIVE");
    expect(byName["Active Key"]?.prefix).toBe(aKey.prefix);
    expect(byName["Active Key"]?.createdByName).toBe("admin@example.com");
    expect(byName["Expired Key"]?.status).toBe("EXPIRED");
    expect(byName["Revoked Key"]?.status).toBe("REVOKED");

    const serialized = listRes.body;
    expect(serialized).not.toContain("keyHash");
    expect(serialized).not.toContain("plaintextKey");
    expect(serialized).not.toContain(aKey.plaintextKey);
    expect(serialized).not.toContain(revKey.plaintextKey);
  });

  it("[SC-KEY-004] revoking a key immediately rejects subsequent ingest calls with 401 INVALID_API_KEY and enforces project ownership", async () => {
    const { admin, member, projectAId, projectBId } = await seedProjectWorkspace();
    const probe = createIngestProbeApp();
    await probe.ready();

    try {
      const created = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, { name: "CI Runner" })
      ).json<{ data: CreatedApiKey }>().data;

      // Active key succeeds immediately.
      const before = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${created.plaintextKey}` },
      });
      expect(before.statusCode).toBe(200);
      expect(before.json()).toMatchObject({
        success: true,
        data: { projectId: projectAId, apiKeyId: created.id },
      });

      // Member cannot revoke; revoking Project A's key via Project B's URL returns 404.
      expect(
        (await callAs(app, member, "DELETE", `/api/v1/projects/${projectAId}/api-keys/${created.id}`)).statusCode,
      ).toBe(403);
      expect(
        (await callAs(app, admin, "DELETE", `/api/v1/projects/${projectBId}/api-keys/${created.id}`)).statusCode,
      ).toBe(404);
      expect(
        (await callAs(app, admin, "DELETE", `/api/v1/projects/${projectAId}/api-keys/not-a-uuid`)).statusCode,
      ).toBe(404);

      // Concurrent double-revoke yields exactly one 204 and one 404.
      const [rev1, rev2] = await Promise.all([
        callAs(app, admin, "DELETE", `/api/v1/projects/${projectAId}/api-keys/${created.id}`),
        callAs(app, admin, "DELETE", `/api/v1/projects/${projectAId}/api-keys/${created.id}`),
      ]);
      expect([rev1.statusCode, rev2.statusCode].sort()).toEqual([204, 404]);

      // Next ingest request is rejected immediately with 401 INVALID_API_KEY.
      const after = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${created.plaintextKey}` },
      });
      expect(after.statusCode).toBe(401);
      expect(after.json()).toMatchObject({ success: false, error: { code: "INVALID_API_KEY" } });

      // Expired key and soft-deleted project key also return 401 INVALID_API_KEY.
      const temp = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, {
          name: "Short Lived",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        })
      ).json<{ data: CreatedApiKey }>().data;
      await testDb.db.apiKey.update({ where: { id: temp.id }, data: { expiresAt: new Date(Date.now() - 10) } });
      const expiredIngest = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${temp.plaintextKey}` },
      });
      expect(expiredIngest.statusCode).toBe(401);
      expect(expiredIngest.json()).toMatchObject({ success: false, error: { code: "INVALID_API_KEY" } });

      const activeOnB = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectBId}/api-keys`, { name: "Doomed Proj Key" })
      ).json<{ data: CreatedApiKey }>().data;
      await callAs(app, admin, "DELETE", `/api/v1/projects/${projectBId}`);
      const deletedProjIngest = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${activeOnB.plaintextKey}` },
      });
      expect(deletedProjIngest.statusCode).toBe(401);
      expect(deletedProjIngest.json()).toMatchObject({ success: false, error: { code: "INVALID_API_KEY" } });
    } finally {
      await probe.close();
    }
  });
});

describe("Acceptance S-008a AC3-AC4: route scope boundaries, throttling & fail-open rate limits", () => {
  it("[SC-KEY-005] valid API key fails with 401 on non-ingest routes, and session cookies are rejected on ingest routes", async () => {
    const { admin, projectAId } = await seedProjectWorkspace();
    const probe = createIngestProbeApp();
    await probe.ready();

    try {
      const created = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, { name: "Scope Test" })
      ).json<{ data: CreatedApiKey }>().data;

      for (const path of [
        "/api/v1/orgs",
        "/api/v1/auth/me",
        `/api/v1/projects/${projectAId}`,
        `/api/v1/projects/${projectAId}/api-keys`,
      ]) {
        const res = await app.inject({
          method: "GET",
          url: path,
          headers: { authorization: `Bearer ${created.plaintextKey}` },
        });
        expect(res.statusCode).toBe(401);
        expect(res.json()).toMatchObject({ success: false, error: { code: "UNAUTHENTICATED" } });
      }

      // Session cookies alone (no Bearer API key) are rejected on /api/v1/ingest/*.
      const cookieIngest = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        cookies: { tp_access: admin.accessToken },
      });
      expect(cookieIngest.statusCode).toBe(401);
      expect(cookieIngest.json()).toMatchObject({ success: false, error: { code: "INVALID_API_KEY" } });

      // Missing or malformed Bearer schemes also get 401 INVALID_API_KEY.
      for (const authHeader of [undefined, "Basic abc", "Bearer ", "Bearer not_tp_live_123"]) {
        const badIngest = await probe.inject({
          method: "POST",
          url: "/api/v1/ingest/runs",
          ...(authHeader ? { headers: { authorization: authHeader } } : {}),
        });
        expect(badIngest.statusCode).toBe(401);
        expect(badIngest.json()).toMatchObject({ success: false, error: { code: "INVALID_API_KEY" } });
      }
    } finally {
      await probe.close();
    }
  });

  it("[SC-KEY-006] resolves project exclusively from the key, blocks cross-project data (404), throttles lastUsedAt writes, and redacts plaintextKey in logs", async () => {
    const { admin, projectAId, projectBId } = await seedProjectWorkspace();
    let nowMs = 1_700_000_000_000;
    const probe = createIngestProbeApp({
      lastUsedThrottleMs: 60_000,
      now: () => new Date(nowMs),
    });
    await probe.ready();

    try {
      expect(LOG_REDACT_PATHS).toContain("*.plaintextKey");
      expect(LOG_REDACT_PATHS).toContain("req.headers.authorization");

      const keyA = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, { name: "Key A" })
      ).json<{ data: CreatedApiKey }>().data;
      await callAs(app, admin, "POST", `/api/v1/projects/${projectBId}/api-keys`, { name: "Key B" });

      // Project A's key cannot access Project B's resources -> 404.
      const cross = await probe.inject({
        method: "GET",
        url: `/api/v1/ingest/projects/${projectBId}/probe`,
        headers: { authorization: `Bearer ${keyA.plaintextKey}` },
      });
      expect(cross.statusCode).toBe(404);

      const first = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${keyA.plaintextKey}` },
      });
      expect(first.statusCode).toBe(200);
      const t1 = (await testDb.db.apiKey.findUnique({ where: { id: keyA.id } }))?.lastUsedAt?.getTime();
      expect(t1).toBe(nowMs);

      // Within 60s throttle window: lastUsedAt is NOT re-written.
      nowMs += 30_000;
      const second = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${keyA.plaintextKey}` },
      });
      expect(second.statusCode).toBe(200);
      const t2 = (await testDb.db.apiKey.findUnique({ where: { id: keyA.id } }))?.lastUsedAt?.getTime();
      expect(t2).toBe(t1);

      // Past 60s throttle window: lastUsedAt updates cleanly.
      nowMs += 35_000;
      const third = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${keyA.plaintextKey}` },
      });
      expect(third.statusCode).toBe(200);
      const t3 = (await testDb.db.apiKey.findUnique({ where: { id: keyA.id } }))?.lastUsedAt?.getTime();
      expect(t3).toBe(nowMs);
    } finally {
      await probe.close();
    }
  });

  it("[SC-KEY-007] enforces per-key and per-project limits (429 + Retry-After) independently and fails open when the store is unreachable", async () => {
    const { admin, projectAId, projectBId } = await seedProjectWorkspace();
    const store = new MemoryRateLimitStore();
    const probe = createIngestProbeApp({
      rateLimitStore: store,
      perKeyMax: 2,
      perProjectMax: 3,
      windowMs: 60_000,
    });
    await probe.ready();

    try {
      const keyA1 = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, { name: "Key A1" })
      ).json<{ data: CreatedApiKey }>().data;
      const keyA2 = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectAId}/api-keys`, { name: "Key A2" })
      ).json<{ data: CreatedApiKey }>().data;
      const keyB1 = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectBId}/api-keys`, { name: "Key B1" })
      ).json<{ data: CreatedApiKey }>().data;

      // Key A1: 2 allowed, 3rd rejected with 429 + Retry-After (per-key limit = 2).
      expect(
        (
          await probe.inject({
            method: "POST",
            url: "/api/v1/ingest/runs",
            headers: { authorization: `Bearer ${keyA1.plaintextKey}` },
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await probe.inject({
            method: "POST",
            url: "/api/v1/ingest/runs",
            headers: { authorization: `Bearer ${keyA1.plaintextKey}` },
          })
        ).statusCode,
      ).toBe(200);
      const limitedKey = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${keyA1.plaintextKey}` },
      });
      expect(limitedKey.statusCode).toBe(429);
      expect(limitedKey.json()).toMatchObject({ success: false, error: { code: "RATE_LIMITED" } });
      expect(Number(limitedKey.headers["retry-after"])).toBeGreaterThanOrEqual(1);

      // Key A2 still has 1 request left under per-project limit (3), then trips per-project limit too!
      expect(
        (
          await probe.inject({
            method: "POST",
            url: "/api/v1/ingest/runs",
            headers: { authorization: `Bearer ${keyA2.plaintextKey}` },
          })
        ).statusCode,
      ).toBe(200);
      const limitedProject = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${keyA2.plaintextKey}` },
      });
      expect(limitedProject.statusCode).toBe(429);

      // Project B's key is completely unaffected.
      expect(
        (
          await probe.inject({
            method: "POST",
            url: "/api/v1/ingest/runs",
            headers: { authorization: `Bearer ${keyB1.plaintextKey}` },
          })
        ).statusCode,
      ).toBe(200);

      // Failing store -> fail OPEN (200) per security-model.md §5!
      const failingStore: RateLimitStore = {
        async hit() {
          throw new Error("Redis connection lost");
        },
      };
      const failOpenProbe = createIngestProbeApp({ rateLimitStore: failingStore });
      await failOpenProbe.ready();
      try {
        const res = await failOpenProbe.inject({
          method: "POST",
          url: "/api/v1/ingest/runs",
          headers: { authorization: `Bearer ${keyB1.plaintextKey}` },
        });
        expect(res.statusCode).toBe(200);
      } finally {
        await failOpenProbe.close();
      }
    } finally {
      await probe.close();
    }
  });
});
