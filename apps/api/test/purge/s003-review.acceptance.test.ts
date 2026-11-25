/**
 * Acceptance S-003-review: covers findings from Round 1 independent review:
 * - Stalled / reconnecting Redis must not hang DELETE /orgs/:orgId or DELETE /projects/:projectId (Security F1)
 * - Sibling soft-deleted orgs and sibling soft-deleted projects are never touched (Test F1)
 * - onEnqueueError / app.log.error is invoked when enqueue fails (Claims AC4 / Test F2)
 * - sweepSoftDeletedTenants skips soft-deleted projects under soft-deleted orgs (Test F3)
 * - Concurrent double-delete enqueues once, 404s enqueue nothing, schema bounds & requireDb fail closed (Test F5)
 */
import net from "node:net";
import { truncateAll, useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import RedisMock from "ioredis-mock";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { createRedis } from "../../src/lib/redis";
import { processors, type ProcessorDeps } from "../../src/queues/processors";
import { createQueueClient, JOBS, type JobData, type JobName, type QueueClient } from "../../src/queues/registry";
import { callAs, createUser, ORIGIN, type TestUser } from "../orgs/helpers";

const testDb = useTestDatabase();

function makeDeps(withDb = true): ProcessorDeps {
  return {
    redis: new RedisMock(),
    now: () => new Date("2026-11-25T15:00:00.000Z"),
    ...(withDb ? { db: testDb.db } : {}),
  };
}

function createSpyQueueClient() {
  const enqueued: Array<{ name: JobName; data: unknown; jobId?: string }> = [];
  let failNext = false;

  const client: QueueClient = {
    async enqueue<N extends JobName>(
      name: N,
      data: JobData<N>,
      opts?: { jobId?: string; delayMs?: number },
    ): Promise<string> {
      if (failNext) throw new Error("Redis down");
      JOBS[name].schema.parse(data);
      enqueued.push({ name, data, ...(opts?.jobId ? { jobId: opts.jobId } : {}) });
      return opts?.jobId ?? `job_${enqueued.length}`;
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
      failNext = value;
    },
  };
}

let app: FastifyInstance;
let spyQueue: ReturnType<typeof createSpyQueueClient>;

function testEnv() {
  return loadApiEnv({
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
}

beforeAll(async () => {
  spyQueue = createSpyQueueClient();
  app = await buildApp({
    env: testEnv(),
    db: testDb.db,
    mailer: new TestMailer(),
    logger: false,
    queueClient: spyQueue.client,
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await truncateAll(testDb.db);
  spyQueue.enqueued.length = 0;
  spyQueue.setFail(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function createOrg(owner: TestUser, slug: string): Promise<string> {
  const res = await callAs(app, owner, "POST", "/api/v1/orgs", { name: slug, slug });
  if (res.statusCode !== 201) throw new Error(`create org failed: ${res.statusCode} ${res.body}`);
  return res.json<{ data: { id: string } }>().data.id;
}

async function createProject(owner: TestUser, orgId: string, slug: string): Promise<string> {
  const res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: slug, slug });
  if (res.statusCode !== 201) throw new Error(`create project failed: ${res.statusCode} ${res.body}`);
  return res.json<{ data: { id: string } }>().data.id;
}

describe("Acceptance S-003-review: sibling soft-deleted isolation (F1)", () => {
  it("[SC-ORG-004] tenant.purge-org deletes only the targeted soft-deleted org and keeps sibling soft-deleted orgs", async () => {
    const owner = await createUser(app, testDb.db, "sib-org@example.com");
    const orgA = await createOrg(owner, "soft-a");
    const orgB = await createOrg(owner, "soft-b");
    await testDb.db.organization.updateMany({ where: { id: { in: [orgA, orgB] } }, data: { deletedAt: new Date() } });

    await processors["tenant.purge-org"]({ orgId: orgA }, makeDeps());

    expect(await testDb.db.organization.findUnique({ where: { id: orgA } })).toBeNull();
    expect(await testDb.db.organization.findUnique({ where: { id: orgB } })).not.toBeNull();
  });

  it("[SC-ORG-008] tenant.purge-project deletes only the targeted soft-deleted project and keeps sibling soft-deleted projects in the same org", async () => {
    const owner = await createUser(app, testDb.db, "sib-proj@example.com");
    const orgId = await createOrg(owner, "sib-org");
    const proj1 = await createProject(owner, orgId, "soft-p1");
    const proj2 = await createProject(owner, orgId, "soft-p2");
    await testDb.db.project.updateMany({ where: { id: { in: [proj1, proj2] } }, data: { deletedAt: new Date() } });

    await processors["tenant.purge-project"]({ orgId, projectId: proj1 }, makeDeps());

    expect(await testDb.db.project.findUnique({ where: { id: proj1 } })).toBeNull();
    expect(await testDb.db.project.findUnique({ where: { id: proj2 } })).not.toBeNull();
  });
});

describe("Acceptance S-003-review: sweep skips projects under soft-deleted orgs (F3)", () => {
  it("[SC-ORG-004] system.purge-sweep does not waste live-org project batch slots on soft-deleted projects of soft-deleted orgs", async () => {
    const owner = await createUser(app, testDb.db, "sweep-filter@example.com");
    const oldestDeletedOrg = await createOrg(owner, "oldest-deleted-org");
    const newerDeletedOrg = await createOrg(owner, "newer-deleted-org");
    const liveOrg = await createOrg(owner, "live-org");

    // Create a soft-deleted project inside newerDeletedOrg with an OLDER deletedAt than liveOrg's deleted project.
    const orphanedDeletedProj = await createProject(owner, newerDeletedOrg, "orphaned-del");
    const liveOrgDeletedProj = await createProject(owner, liveOrg, "live-org-del");

    await testDb.db.organization.update({
      where: { id: oldestDeletedOrg },
      data: { deletedAt: new Date("2026-10-01T00:00:00Z") },
    });
    await testDb.db.organization.update({
      where: { id: newerDeletedOrg },
      data: { deletedAt: new Date("2026-10-02T00:00:00Z") },
    });
    await testDb.db.project.update({
      where: { id: orphanedDeletedProj },
      data: { deletedAt: new Date("2026-10-01T00:00:00Z") },
    });
    await testDb.db.project.update({
      where: { id: liveOrgDeletedProj },
      data: { deletedAt: new Date("2026-10-03T00:00:00Z") },
    });

    // batchSize: 1 purges oldestDeletedOrg (leaving newerDeletedOrg + orphanedDeletedProj) and MUST purge liveOrgDeletedProj.
    await processors["system.purge-sweep"]({ batchSize: 1 }, makeDeps());

    expect(await testDb.db.organization.findUnique({ where: { id: oldestDeletedOrg } })).toBeNull();
    expect(await testDb.db.organization.findUnique({ where: { id: newerDeletedOrg } })).not.toBeNull();
    expect(await testDb.db.project.findUnique({ where: { id: orphanedDeletedProj } })).not.toBeNull();
    expect(await testDb.db.project.findUnique({ where: { id: liveOrgDeletedProj } })).toBeNull();
  });
});

describe("Acceptance S-003-review: enqueue logging, concurrency, 404s, and stalled Redis resilience", () => {
  it("[SC-ORG-004] logs via app.log.error when enqueue fails and returns 204; 404/403 deletes enqueue nothing", async () => {
    const owner = await createUser(app, testDb.db, "log-owner@example.com");
    const admin = await createUser(app, testDb.db, "log-admin@example.com");
    const orgId = await createOrg(owner, "log-org");
    await testDb.db.orgMember.create({ data: { orgId, userId: admin.id, role: "ADMIN" } });
    const projId = await createProject(owner, orgId, "log-proj");

    // Admin cannot delete org (403); missing/foreign IDs return 404; neither enqueues.
    expect((await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}`)).statusCode).toBe(403);
    expect((await callAs(app, owner, "DELETE", "/api/v1/orgs/01950000-0000-7000-8000-000000000099")).statusCode).toBe(
      404,
    );
    expect(
      (await callAs(app, owner, "DELETE", "/api/v1/projects/01950000-0000-7000-8000-000000000099")).statusCode,
    ).toBe(404);
    expect(spyQueue.enqueued).toEqual([]);

    const logErrorSpy = vi.spyOn(app.log, "error");
    spyQueue.setFail(true);

    expect((await callAs(app, owner, "DELETE", `/api/v1/projects/${projId}`)).statusCode).toBe(204);
    expect((await callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}`)).statusCode).toBe(204);
    expect(logErrorSpy).toHaveBeenCalledTimes(2);
    expect(logErrorSpy.mock.calls[0]?.[1]).toBe("failed to enqueue purge job");
    expect(logErrorSpy.mock.calls[1]?.[1]).toBe("failed to enqueue purge job");

    // Re-deleting already soft-deleted org/project returns 404 and enqueues nothing.
    spyQueue.setFail(false);
    expect((await callAs(app, owner, "DELETE", `/api/v1/projects/${projId}`)).statusCode).toBe(404);
    expect((await callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}`)).statusCode).toBe(404);
    expect(spyQueue.enqueued).toEqual([]);
  });

  it("[SC-ORG-004] concurrent double-delete produces one 204, one 404, and enqueues exactly once", async () => {
    const owner = await createUser(app, testDb.db, "race-del@example.com");
    const orgId = await createOrg(owner, "race-org");
    const projId = await createProject(owner, orgId, "race-proj");

    const projResults = await Promise.all([
      callAs(app, owner, "DELETE", `/api/v1/projects/${projId}`),
      callAs(app, owner, "DELETE", `/api/v1/projects/${projId}`),
    ]);
    expect(projResults.map((r) => r.statusCode).sort()).toEqual([204, 404]);
    expect(spyQueue.enqueued).toHaveLength(1);

    const orgResults = await Promise.all([
      callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}`),
      callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}`),
    ]);
    expect(orgResults.map((r) => r.statusCode).sort()).toEqual([204, 404]);
    expect(spyQueue.enqueued).toHaveLength(2);
  });

  it("[SC-ORG-004] DELETE returns 204 promptly without hanging when Redis socket stalls or is reconnecting", async () => {
    // Black-hole TCP server accepts the connection and drops all packets.
    const blackHole = net.createServer((socket) => {
      socket.on("data", () => undefined);
    });
    await new Promise<void>((resolve) => blackHole.listen(0, "127.0.0.1", resolve));
    const address = blackHole.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");

    const stalledRedis = createRedis(`redis://127.0.0.1:${address.port}`, { failFast: true });
    stalledRedis.on("error", () => undefined);
    const stalledClient = createQueueClient(stalledRedis, "tp-stalled-test", { enqueueTimeoutMs: 150 });
    const stalledApp = await buildApp({
      env: testEnv(),
      db: testDb.db,
      mailer: new TestMailer(),
      logger: false,
      queueClient: stalledClient,
    });
    await stalledApp.ready();

    try {
      const owner = await createUser(stalledApp, testDb.db, "stalled@example.com");
      const orgRes = await callAs(stalledApp, owner, "POST", "/api/v1/orgs", { name: "Stalled", slug: "stalled" });
      const orgId = orgRes.json<{ data: { id: string } }>().data.id;

      const started = performance.now();
      const delRes = await callAs(stalledApp, owner, "DELETE", `/api/v1/orgs/${orgId}`);
      const elapsedMs = performance.now() - started;

      expect(delRes.statusCode).toBe(204);
      expect(elapsedMs).toBeLessThan(1_500);
    } finally {
      await stalledApp.close();
      await stalledClient.close();
      stalledRedis.disconnect();
      await new Promise<void>((resolve) => blackHole.close(() => resolve()));
    }
  });

  it("[SC-ORG-004] DELETE returns 204 promptly when Redis is stuck in reconnecting state", async () => {
    const reconnectingRedis = createRedis("redis://127.0.0.1:1", { failFast: true });
    reconnectingRedis.on("error", () => undefined);
    reconnectingRedis.connect().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const reconnectingClient = createQueueClient(reconnectingRedis, "tp-reconn-test", { enqueueTimeoutMs: 150 });
    const reconnApp = await buildApp({
      env: testEnv(),
      db: testDb.db,
      mailer: new TestMailer(),
      logger: false,
      queueClient: reconnectingClient,
    });
    await reconnApp.ready();

    try {
      const owner = await createUser(reconnApp, testDb.db, "reconnecting@example.com");
      const orgRes = await callAs(reconnApp, owner, "POST", "/api/v1/orgs", { name: "Reconn", slug: "reconn" });
      const orgId = orgRes.json<{ data: { id: string } }>().data.id;
      const logSpy = vi.spyOn(reconnApp.log, "error");

      const started = performance.now();
      const delRes = await callAs(reconnApp, owner, "DELETE", `/api/v1/orgs/${orgId}`);
      const elapsedMs = performance.now() - started;

      expect(delRes.statusCode).toBe(204);
      expect(elapsedMs).toBeLessThan(1_500);
      expect(logSpy).toHaveBeenCalledTimes(1);
    } finally {
      await reconnApp.close();
      await reconnectingClient.close();
      reconnectingRedis.disconnect();
    }
  });
});

describe("Acceptance S-003-review: schema bounds and fail-closed db checks", () => {
  it("[SC-SEC-004] enforces batchSize bounds (1..200), rejects invalid project orgId/NUL, and requires db on all purge processors", async () => {
    const validUuid = "01950000-0000-7000-8000-000000000001";

    expect(JOBS["system.purge-sweep"].schema.parse({ batchSize: 1 })).toEqual({ batchSize: 1 });
    expect(JOBS["system.purge-sweep"].schema.parse({ batchSize: 200 })).toEqual({ batchSize: 200 });
    expect(() => JOBS["system.purge-sweep"].schema.parse({ batchSize: -1 })).toThrow();
    expect(() => JOBS["system.purge-sweep"].schema.parse({ batchSize: "50" })).toThrow();

    expect(() => JOBS["tenant.purge-project"].schema.parse({ orgId: "", projectId: validUuid })).toThrow();
    expect(() => JOBS["tenant.purge-project"].schema.parse({ orgId: "bad", projectId: validUuid })).toThrow();
    expect(() =>
      JOBS["tenant.purge-project"].schema.parse({ orgId: `${validUuid}\0`, projectId: validUuid }),
    ).toThrow();
    expect(() =>
      JOBS["tenant.purge-project"].schema.parse({ orgId: validUuid, projectId: `${validUuid}\0` }),
    ).toThrow();

    await expect(
      processors["tenant.purge-project"]({ orgId: validUuid, projectId: validUuid }, makeDeps(false)),
    ).rejects.toThrow();
    await expect(processors["system.purge-sweep"]({ batchSize: 50 }, makeDeps(false))).rejects.toThrow();
  });
});
