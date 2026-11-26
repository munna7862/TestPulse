/**
 * Review acceptance tests S-008a: closes R1 Test Auditor gaps without modifying committed specs.
 * Covers list ordering & status precedence, write-time races, concurrent revoke vs ingest, soft-deleted
 * org & malformed Bearer auth, throttled concurrent lastUsedAt + outage resilience, exact expiresAt === now
 * boundaries, deterministic transferOwnership concurrency branches, and PROJECT_ROUTE_POLICY entries.
 */
import sensible from "@fastify/sensible";
import { truncateAll, useTestDatabase } from "@testpulse/db/testing";
import { type ApiKey, type CreatedApiKey } from "@testpulse/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { ApiKeyService } from "../../src/modules/api-keys";
import { OrgService } from "../../src/modules/orgs/orgs.service";
import { apiKeyContextOf, createApiKeyAuthHook } from "../../src/plugins/api-key-auth";
import { registerErrorHandling } from "../../src/plugins/error-handler";
import { PROJECT_ROUTE_POLICY } from "../../src/plugins/tenant-context";
import { callAs, createUser, ORIGIN } from "../orgs/helpers";

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

async function seedProject() {
  const owner = await createUser(app, testDb.db, "rev-owner@example.com");
  const admin = await createUser(app, testDb.db, "rev-admin@example.com");
  const admin2 = await createUser(app, testDb.db, "rev-admin2@example.com");

  const orgRes = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Review Org", slug: "review-org" });
  const orgId = orgRes.json<{ data: { id: string } }>().data.id;
  await testDb.db.orgMember.createMany({
    data: [
      { orgId, userId: admin.id, role: "ADMIN" },
      { orgId, userId: admin2.id, role: "ADMIN" },
    ],
  });
  const projRes = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Review Proj" });
  const projectId = projRes.json<{ data: { id: string } }>().data.id;
  return { owner, admin, admin2, orgId, projectId };
}

function createProbe(options?: {
  db?: typeof testDb.db;
  now?: () => Date;
  lastUsedThrottleMs?: number;
  warnSpy?: (msg: string) => void;
}) {
  const probe = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  probe.setValidatorCompiler(validatorCompiler);
  probe.setSerializerCompiler(serializerCompiler);
  void probe.register(sensible);
  registerErrorHandling(probe);

  if (options?.warnSpy) {
    const warn = options.warnSpy;
    probe.addHook("onRequest", async (request) => {
      const origWarn = request.log.warn.bind(request.log);
      request.log.warn = (...args: Parameters<typeof origWarn>) => {
        warn(typeof args[1] === "string" ? args[1] : String(args[0]));
        return origWarn(...args);
      };
    });
  }

  const hook = createApiKeyAuthHook({
    db: options?.db ?? testDb.db,
    ...(options?.now ? { now: options.now } : {}),
    ...(options?.lastUsedThrottleMs !== undefined ? { lastUsedThrottleMs: options.lastUsedThrottleMs } : {}),
  });

  probe.post("/api/v1/ingest/runs", { preValidation: [hook] }, async (request) => {
    const ctx = apiKeyContextOf(request);
    return { success: true, data: ctx };
  });

  return probe;
}

describe("Acceptance S-008a review: ordering, boundaries, write-time races & concurrent throttling", () => {
  it("[SC-SEC-003] PROJECT_ROUTE_POLICY explicitly lists all three API key routes as ADMIN minimum", () => {
    const table = Object.fromEntries(PROJECT_ROUTE_POLICY.map((r) => [`${r.method} ${r.url}`, r.minRole]));
    expect(table).toMatchObject({
      "GET /api/v1/projects/:projectId/api-keys": "ADMIN",
      "POST /api/v1/projects/:projectId/api-keys": "ADMIN",
      "DELETE /api/v1/projects/:projectId/api-keys/:keyId": "ADMIN",
    });
  });

  it("[SC-KEY-003] lists newest-first, supports ACTIVE with future expiresAt, and gives REVOKED precedence over EXPIRED", async () => {
    const { admin, projectId } = await seedProject();

    const k1 = (
      await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, { name: "First Key" })
    ).json<{ data: CreatedApiKey }>().data;
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const k2 = (
      await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, {
        name: "Expiring Active",
        expiresAt: future,
      })
    ).json<{ data: CreatedApiKey }>().data;
    const k3 = (
      await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, { name: "Both Revoked Expired" })
    ).json<{ data: CreatedApiKey }>().data;

    await testDb.db.apiKey.update({
      where: { id: k3.id },
      data: { revokedAt: new Date(Date.now() - 10_000), expiresAt: new Date(Date.now() - 20_000) },
    });

    const listRes = await callAs(app, admin, "GET", `/api/v1/projects/${projectId}/api-keys`);
    expect(listRes.statusCode).toBe(200);
    const items = listRes.json<{ data: ApiKey[] }>().data;
    expect(items.map((item) => item.id)).toEqual([k3.id, k2.id, k1.id]);
    expect(items[0]?.status).toBe("REVOKED");
    expect(items[1]?.status).toBe("ACTIVE");
    expect(items[1]?.expiresAt).toBe(future);
  });

  it("[SC-KEY-001] enforces empty body 400 and mid-request write-time demotion, deleted project, and deleted org guards", async () => {
    const { admin, orgId, projectId } = await seedProject();
    expect((await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, {})).statusCode).toBe(400);

    // 1) Post-preValidation caller demotion inside create -> 403.
    const origCreate = Object.getOwnPropertyDescriptor(ApiKeyService.prototype, "create")
      ?.value as ApiKeyService["create"];
    vi.spyOn(ApiKeyService.prototype, "create").mockImplementationOnce(async function (
      this: ApiKeyService,
      ...args: Parameters<ApiKeyService["create"]>
    ) {
      await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "MEMBER" } });
      return origCreate.apply(this, args);
    });
    expect(
      (await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, { name: "Race Demote" })).statusCode,
    ).toBe(403);

    await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "ADMIN" } });
    const liveKey = (
      await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, { name: "For Delete Race" })
    ).json<{ data: CreatedApiKey }>().data;

    // 2) Post-preValidation soft-deleted project inside revoke -> 404.
    const origRevoke = Object.getOwnPropertyDescriptor(ApiKeyService.prototype, "revoke")
      ?.value as ApiKeyService["revoke"];
    vi.spyOn(ApiKeyService.prototype, "revoke").mockImplementationOnce(async function (
      this: ApiKeyService,
      ...args: Parameters<ApiKeyService["revoke"]>
    ) {
      await testDb.db.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
      return origRevoke.apply(this, args);
    });
    expect(
      (await callAs(app, admin, "DELETE", `/api/v1/projects/${projectId}/api-keys/${liveKey.id}`)).statusCode,
    ).toBe(404);

    // 3) Post-preValidation soft-deleted org inside create -> 404.
    await testDb.db.project.update({ where: { id: projectId }, data: { deletedAt: null } });
    vi.spyOn(ApiKeyService.prototype, "create").mockImplementationOnce(async function (
      this: ApiKeyService,
      ...args: Parameters<ApiKeyService["create"]>
    ) {
      await testDb.db.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
      return origCreate.apply(this, args);
    });
    expect(
      (await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, { name: "Dead Org" })).statusCode,
    ).toBe(404);
  });

  it("[SC-KEY-004] handles concurrent revoke vs ingest, soft-deleted org ingest 401, unknown tp_live_ key, and malformed Bearer headers", async () => {
    const { admin, orgId, projectId } = await seedProject();
    const probe = createProbe();
    await probe.ready();

    try {
      const created = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, { name: "Race Key" })
      ).json<{ data: CreatedApiKey }>().data;

      // Concurrent revoke + ingest never 500s; subsequent ingest strictly 401 INVALID_API_KEY.
      const [revRes, ingRes] = await Promise.all([
        callAs(app, admin, "DELETE", `/api/v1/projects/${projectId}/api-keys/${created.id}`),
        probe.inject({
          method: "POST",
          url: "/api/v1/ingest/runs",
          headers: { authorization: `Bearer ${created.plaintextKey}` },
        }),
      ]);
      expect(revRes.statusCode).toBe(204);
      expect([200, 401]).toContain(ingRes.statusCode);
      const afterRevoke = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${created.plaintextKey}` },
      });
      expect(afterRevoke.statusCode).toBe(401);
      expect(afterRevoke.json()).toMatchObject({ error: { code: "INVALID_API_KEY" } });

      // Edge Bearer header shapes + unknown tp_live_ token -> 401 INVALID_API_KEY.
      for (const badAuth of [
        "Bearer",
        `Bearer tp_live_${"a".repeat(125)}`,
        "Bearer tp_live_abc\u0007def",
        `Bearer tp_live_${"Z".repeat(43)}`,
      ]) {
        const res = await probe.inject({
          method: "POST",
          url: "/api/v1/ingest/runs",
          headers: { authorization: badAuth },
        });
        expect(res.statusCode).toBe(401);
        expect(res.json()).toMatchObject({ error: { code: "INVALID_API_KEY" } });
      }

      // Soft-deleted Organization (while Project.deletedAt is null) -> 401 INVALID_API_KEY.
      const orgKey = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, { name: "Org Delete Test" })
      ).json<{ data: CreatedApiKey }>().data;
      await testDb.db.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
      const deletedOrgRes = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${orgKey.plaintextKey}` },
      });
      expect(deletedOrgRes.statusCode).toBe(401);
      expect(deletedOrgRes.json()).toMatchObject({ error: { code: "INVALID_API_KEY" } });
    } finally {
      await probe.close();
    }
  });

  it("[SC-KEY-006] throttles concurrent burst lastUsedAt writes to <= 1 DB update and still succeeds if lastUsedAt write fails", async () => {
    const { admin, projectId } = await seedProject();
    let updateCalls = 0;
    const countingDb = testDb.db.$extends({
      query: {
        apiKey: {
          async updateMany({ args, query }) {
            updateCalls += 1;
            return query(args);
          },
        },
      },
    }) as unknown as typeof testDb.db;

    const probe = createProbe({ db: countingDb, now: () => new Date(1_700_000_000_000), lastUsedThrottleMs: 60_000 });
    await probe.ready();

    try {
      const created = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, { name: "Burst Key" })
      ).json<{ data: CreatedApiKey }>().data;

      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          probe.inject({
            method: "POST",
            url: "/api/v1/ingest/runs",
            headers: { authorization: `Bearer ${created.plaintextKey}` },
          }),
        ),
      );
      expect(responses.every((r) => r.statusCode === 200)).toBe(true);
      expect(updateCalls).toBe(1);
    } finally {
      await probe.close();
    }

    // DB update failure on lastUsedAt logs warning and does NOT fail ingest.
    const warnings: string[] = [];
    const failingUpdateDb = testDb.db.$extends({
      query: {
        apiKey: {
          async updateMany() {
            throw new Error("simulated lock timeout");
          },
        },
      },
    }) as unknown as typeof testDb.db;

    const resilientProbe = createProbe({
      db: failingUpdateDb,
      now: () => new Date(1_700_001_000_000),
      lastUsedThrottleMs: 60_000,
      warnSpy: (msg) => warnings.push(msg),
    });
    await resilientProbe.ready();

    try {
      const created2 = (
        await callAs(app, admin, "POST", `/api/v1/projects/${projectId}/api-keys`, { name: "Resilient Key" })
      ).json<{ data: CreatedApiKey }>().data;
      const res = await resilientProbe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${created2.plaintextKey}` },
      });
      expect(res.statusCode).toBe(200);
      expect(warnings.some((w) => w.includes("lastUsedAt"))).toBe(true);
    } finally {
      await resilientProbe.close();
    }
  });

  it("[SC-KEY-001] [SC-KEY-004] treats exact expiresAt === now as past on create, EXPIRED on list, and 401 on ingest", async () => {
    const { owner, orgId, projectId } = await seedProject();
    const boundary = new Date(1_700_000_000_000);
    const service = new ApiKeyService(testDb.db, () => boundary);
    const ctx = { orgId, projectId, userId: owner.id, role: "OWNER" as const, minRole: "ADMIN" as const };

    await expect(service.create(ctx, { name: "Boundary Equal", expiresAt: boundary.toISOString() })).rejects.toThrow(
      /future/i,
    );

    const validFuture = new Date(boundary.getTime() + 1_000).toISOString();
    const key = await service.create(ctx, { name: "Expires Next Tick", expiresAt: validFuture });
    await testDb.db.apiKey.update({ where: { id: key.id }, data: { expiresAt: boundary } });

    const listed = await service.list(ctx);
    expect(listed.find((item) => item.id === key.id)?.status).toBe("EXPIRED");

    const probe = createProbe({ now: () => boundary });
    await probe.ready();
    try {
      const ingest = await probe.inject({
        method: "POST",
        url: "/api/v1/ingest/runs",
        headers: { authorization: `Bearer ${key.plaintextKey}` },
      });
      expect(ingest.statusCode).toBe(401);
      expect(ingest.json()).toMatchObject({ error: { code: "INVALID_API_KEY" } });
    } finally {
      await probe.close();
    }
  });

  it("[SC-ORG-006] deterministically maps concurrent transferOwnership target removal to 404 and demotion to 400 (rolling back demotion)", async () => {
    const { owner, admin, orgId } = await seedProject();

    // 1) Simulate concurrent target demotion inside transferOwnership between findFirst and updateMany.
    let demoteOnce = true;
    const demoteDb = testDb.db.$extends({
      query: {
        orgMember: {
          async findFirst({ args, query }) {
            const row = await query(args);
            if (demoteOnce && row && (args.where as { userId?: string })?.userId === admin.id) {
              demoteOnce = false;
              await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "MEMBER" } });
            }
            return row;
          },
        },
      },
    }) as unknown as typeof testDb.db;

    const demoteSvc = new OrgService(demoteDb);
    await expect(
      demoteSvc.transferOwnership({ orgId, userId: owner.id, role: "OWNER", minRole: "OWNER" }, admin.id),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect((await testDb.db.orgMember.findFirst({ where: { orgId, userId: owner.id } }))?.role).toBe("OWNER");

    // Restore admin role and test concurrent target removal -> 404 + Owner preserved.
    await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "ADMIN" } });
    let deleteOnce = true;
    const deleteDb = testDb.db.$extends({
      query: {
        orgMember: {
          async findFirst({ args, query }) {
            const row = await query(args);
            if (deleteOnce && row && (args.where as { userId?: string })?.userId === admin.id) {
              deleteOnce = false;
              await testDb.db.orgMember.deleteMany({ where: { orgId, userId: admin.id } });
            }
            return row;
          },
        },
      },
    }) as unknown as typeof testDb.db;

    const deleteSvc = new OrgService(deleteDb);
    await expect(
      deleteSvc.transferOwnership({ orgId, userId: owner.id, role: "OWNER", minRole: "OWNER" }, admin.id),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect((await testDb.db.orgMember.findFirst({ where: { orgId, userId: owner.id } }))?.role).toBe("OWNER");
  });
});
