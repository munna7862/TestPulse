/**
 * Acceptance S-003 AC1-AC4, AC6 (planning/slices/S-003-purge-soft-deleted.md):
 * Tenant-scoped purge processors, catch-up sweep, delete enqueueing & outage resilience, and job schema validation.
 */
import { truncateAll, useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import RedisMock from "ioredis-mock";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { processors, type ProcessorDeps } from "../../src/queues/processors";
import { JOBS, type JobData, type JobName, type QueueClient } from "../../src/queues/registry";
import { callAs, createUser, ORIGIN, type TestUser } from "../orgs/helpers";

const testDb = useTestDatabase();

interface EnqueuedCall {
  name: JobName;
  data: unknown;
  opts?: { jobId?: string; delayMs?: number };
}

function createFakeQueueClient(opts: { failEnqueue?: boolean } = {}) {
  const enqueued: EnqueuedCall[] = [];
  let shouldFail = opts.failEnqueue ?? false;

  const client: QueueClient = {
    async enqueue<N extends JobName>(
      name: N,
      data: JobData<N>,
      jobOpts?: { jobId?: string; delayMs?: number },
    ): Promise<string> {
      if (shouldFail) throw new Error("Redis connection closed");
      JOBS[name].schema.parse(data);
      enqueued.push({ name, data, ...(jobOpts ? { opts: jobOpts } : {}) });
      return jobOpts?.jobId ?? `job_${enqueued.length}`;
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

function makeDeps(withDb = true): ProcessorDeps {
  return {
    redis: new RedisMock(),
    now: () => new Date("2026-11-25T14:00:00.000Z"),
    ...(withDb ? { db: testDb.db } : {}),
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

describe("Acceptance S-003 AC1: tenant.purge-org processor", () => {
  it("[SC-ORG-004] hard-deletes a soft-deleted org (cascading members and projects), frees its slug, and leaves other orgs untouched", async () => {
    const owner = await createUser(app, testDb.db, "org-owner@example.com");
    const targetOrgId = await createOrg(owner, "doomed-org");
    const keepOrgId = await createOrg(owner, "live-org");
    await createProject(owner, targetOrgId, "doomed-proj");
    await createProject(owner, keepOrgId, "live-proj");

    const delRes = await callAs(app, owner, "DELETE", `/api/v1/orgs/${targetOrgId}`);
    expect(delRes.statusCode).toBe(204);

    // Before purge: slug is still held by the soft-deleted row.
    const conflictRes = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Reused", slug: "doomed-org" });
    expect(conflictRes.statusCode).toBe(409);

    await processors["tenant.purge-org"]({ orgId: targetOrgId }, makeDeps());

    expect(await testDb.db.organization.findUnique({ where: { id: targetOrgId } })).toBeNull();
    expect(await testDb.db.orgMember.count({ where: { orgId: targetOrgId } })).toBe(0);
    expect(await testDb.db.project.count({ where: { orgId: targetOrgId } })).toBe(0);

    // Other org and its data remain intact.
    expect(await testDb.db.organization.findUnique({ where: { id: keepOrgId } })).not.toBeNull();
    expect(await testDb.db.project.count({ where: { orgId: keepOrgId } })).toBe(1);

    // Slug is now free to reuse.
    const reuseRes = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Reborn", slug: "doomed-org" });
    expect(reuseRes.statusCode).toBe(201);
  });

  it("[SC-ORG-004] leaves a live org untouched and is idempotent when the org is already purged", async () => {
    const owner = await createUser(app, testDb.db, "live-check@example.com");
    const orgId = await createOrg(owner, "still-live");
    await createProject(owner, orgId, "proj-1");

    await processors["tenant.purge-org"]({ orgId }, makeDeps());
    expect(await testDb.db.organization.findUnique({ where: { id: orgId } })).not.toBeNull();
    expect(await testDb.db.project.count({ where: { orgId } })).toBe(1);

    // Soft delete, purge once, then purge again: second call is a clean no-op.
    await testDb.db.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
    await processors["tenant.purge-org"]({ orgId }, makeDeps());
    await expect(processors["tenant.purge-org"]({ orgId }, makeDeps())).resolves.toBeUndefined();
    expect(await testDb.db.organization.findUnique({ where: { id: orgId } })).toBeNull();
  });

  it("[SC-ORG-004] fails closed if db dependency is omitted", async () => {
    await expect(
      processors["tenant.purge-org"]({ orgId: "01950000-0000-7000-8000-000000000001" }, makeDeps(false)),
    ).rejects.toThrow();
  });
});

describe("Acceptance S-003 AC2: tenant.purge-project processor", () => {
  it("[SC-ORG-007] [SC-ORG-008] hard-deletes a soft-deleted project, frees its slug in that org, and leaves sibling projects untouched", async () => {
    const owner = await createUser(app, testDb.db, "proj-owner@example.com");
    const orgId = await createOrg(owner, "acme-proj");
    const doomedId = await createProject(owner, orgId, "old-web");
    const keepId = await createProject(owner, orgId, "keep-api");

    const delRes = await callAs(app, owner, "DELETE", `/api/v1/projects/${doomedId}`);
    expect(delRes.statusCode).toBe(204);

    const conflictRes = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, {
      name: "Reused",
      slug: "old-web",
    });
    expect(conflictRes.statusCode).toBe(409);

    await processors["tenant.purge-project"]({ orgId, projectId: doomedId }, makeDeps());

    expect(await testDb.db.project.findUnique({ where: { id: doomedId } })).toBeNull();
    expect(await testDb.db.project.findUnique({ where: { id: keepId } })).not.toBeNull();

    const reuseRes = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, {
      name: "New Web",
      slug: "old-web",
    });
    expect(reuseRes.statusCode).toBe(201);
  });

  it("[SC-SEC-004] refuses cross-tenant deletion when orgId does not own projectId, and leaves live projects untouched", async () => {
    const owner = await createUser(app, testDb.db, "cross@example.com");
    const orgA = await createOrg(owner, "org-a");
    const orgB = await createOrg(owner, "org-b");
    const liveInA = await createProject(owner, orgA, "live-a");
    const softDeletedInB = await createProject(owner, orgB, "deleted-b");
    await testDb.db.project.update({ where: { id: softDeletedInB }, data: { deletedAt: new Date() } });

    // Mismatched orgId must delete nothing.
    await processors["tenant.purge-project"]({ orgId: orgA, projectId: softDeletedInB }, makeDeps());
    expect(await testDb.db.project.findUnique({ where: { id: softDeletedInB } })).not.toBeNull();

    // Live project in orgA must not be deleted.
    await processors["tenant.purge-project"]({ orgId: orgA, projectId: liveInA }, makeDeps());
    expect(await testDb.db.project.findUnique({ where: { id: liveInA } })).not.toBeNull();

    // Matching orgB purges softDeletedInB, and repeating is idempotent.
    await processors["tenant.purge-project"]({ orgId: orgB, projectId: softDeletedInB }, makeDeps());
    await expect(
      processors["tenant.purge-project"]({ orgId: orgB, projectId: softDeletedInB }, makeDeps()),
    ).resolves.toBeUndefined();
    expect(await testDb.db.project.findUnique({ where: { id: softDeletedInB } })).toBeNull();
  });
});

describe("Acceptance S-003 AC3: system.purge-sweep processor", () => {
  it("[SC-ORG-004] purges soft-deleted orgs and projects in bounded batches, leaves live rows intact, and is safe concurrently", async () => {
    const owner = await createUser(app, testDb.db, "sweep@example.com");
    const liveOrg = await createOrg(owner, "live-org");
    const liveProject = await createProject(owner, liveOrg, "live-proj");
    const deletedProj1 = await createProject(owner, liveOrg, "del-proj-1");
    await testDb.db.project.update({
      where: { id: deletedProj1 },
      data: { deletedAt: new Date("2026-10-01T00:00:00Z") },
    });
    // Deleted projects do not count toward the Free plan limit, so a second deleted project can be created.
    const deletedProj2 = await createProject(owner, liveOrg, "del-proj-2");
    const deletedOrg1 = await createOrg(owner, "del-org-1");
    const deletedOrg2 = await createOrg(owner, "del-org-2");
    await createProject(owner, deletedOrg1, "child-1");

    const t0 = new Date("2026-10-01T00:00:00Z");
    const t1 = new Date("2026-10-01T01:00:00Z");
    await testDb.db.project.update({ where: { id: deletedProj2 }, data: { deletedAt: t1 } });
    await testDb.db.organization.update({ where: { id: deletedOrg1 }, data: { deletedAt: t0 } });
    await testDb.db.organization.update({ where: { id: deletedOrg2 }, data: { deletedAt: t1 } });

    // First sweep with batchSize: 1 purges the oldest 1 deleted org and 1 deleted project.
    await processors["system.purge-sweep"]({ batchSize: 1 }, makeDeps());
    expect(await testDb.db.organization.findUnique({ where: { id: deletedOrg1 } })).toBeNull();
    expect(await testDb.db.organization.findUnique({ where: { id: deletedOrg2 } })).not.toBeNull();
    expect(await testDb.db.project.findUnique({ where: { id: deletedProj1 } })).toBeNull();
    expect(await testDb.db.project.findUnique({ where: { id: deletedProj2 } })).not.toBeNull();

    // Concurrent sweeps clean up the rest idempotently without throwing.
    await Promise.all([
      processors["system.purge-sweep"]({ batchSize: 50 }, makeDeps()),
      processors["system.purge-sweep"]({ batchSize: 50 }, makeDeps()),
    ]);

    expect(await testDb.db.organization.findUnique({ where: { id: deletedOrg2 } })).toBeNull();
    expect(await testDb.db.project.findUnique({ where: { id: deletedProj2 } })).toBeNull();
    expect(await testDb.db.organization.findUnique({ where: { id: liveOrg } })).not.toBeNull();
    expect(await testDb.db.project.findUnique({ where: { id: liveProject } })).not.toBeNull();
  });
});

describe("Acceptance S-003 AC4: delete routes enqueue purge jobs and survive queue outages", () => {
  it("[SC-ORG-004] DELETE org and DELETE project enqueue deduplicated jobs only on 204, and return 204 if enqueue fails", async () => {
    const owner = await createUser(app, testDb.db, "enqueue-owner@example.com");
    const member = await createUser(app, testDb.db, "enqueue-member@example.com");
    const orgId = await createOrg(owner, "enqueue-org");
    await testDb.db.orgMember.create({ data: { orgId, userId: member.id, role: "MEMBER" } });
    const projId = await createProject(owner, orgId, "enqueue-proj");

    // Rejected deletes enqueue nothing.
    expect((await callAs(app, member, "DELETE", `/api/v1/projects/${projId}`)).statusCode).toBe(403);
    expect((await callAs(app, member, "DELETE", `/api/v1/orgs/${orgId}`)).statusCode).toBe(403);
    expect(fakeQueue.enqueued).toEqual([]);

    // Successful project delete enqueues tenant.purge-project with jobId.
    const delProj = await callAs(app, owner, "DELETE", `/api/v1/projects/${projId}`);
    expect(delProj.statusCode).toBe(204);
    expect(fakeQueue.enqueued).toEqual([
      {
        name: "tenant.purge-project",
        data: { orgId, projectId: projId },
        opts: { jobId: `purge-project_${projId}` },
      },
    ]);

    // Successful org delete enqueues tenant.purge-org with jobId.
    const delOrg = await callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}`);
    expect(delOrg.statusCode).toBe(204);
    expect(fakeQueue.enqueued).toHaveLength(2);
    expect(fakeQueue.enqueued[1]).toEqual({
      name: "tenant.purge-org",
      data: { orgId },
      opts: { jobId: `purge-org_${orgId}` },
    });

    // Outage resilience: enqueue throwing still returns 204 and sweep catches up.
    const org2 = await createOrg(owner, "outage-org");
    const proj2 = await createProject(owner, org2, "outage-proj");
    fakeQueue.setFail(true);

    expect((await callAs(app, owner, "DELETE", `/api/v1/projects/${proj2}`)).statusCode).toBe(204);
    expect((await callAs(app, owner, "DELETE", `/api/v1/orgs/${org2}`)).statusCode).toBe(204);

    await processors["system.purge-sweep"]({ batchSize: 50 }, makeDeps());
    expect(await testDb.db.organization.findUnique({ where: { id: org2 } })).toBeNull();
    expect(await testDb.db.project.findUnique({ where: { id: proj2 } })).toBeNull();
  });
});

describe("Acceptance S-003 AC6: strict Zod validation on purge job payloads", () => {
  it("[SC-SEC-004] rejects malformed IDs, NUL bytes, unknown keys, and invalid batchSize", () => {
    const validUuid = "01950000-0000-7000-8000-000000000001";

    expect(() => JOBS["tenant.purge-org"].schema.parse({ orgId: "" })).toThrow();
    expect(() => JOBS["tenant.purge-org"].schema.parse({ orgId: "not-a-uuid" })).toThrow();
    expect(() => JOBS["tenant.purge-org"].schema.parse({ orgId: `${validUuid}\0` })).toThrow();
    expect(() => JOBS["tenant.purge-org"].schema.parse({ orgId: validUuid, extra: true })).toThrow();

    expect(() => JOBS["tenant.purge-project"].schema.parse({ orgId: validUuid, projectId: "bad" })).toThrow();
    expect(() =>
      JOBS["tenant.purge-project"].schema.parse({ orgId: validUuid, projectId: validUuid, extra: 1 }),
    ).toThrow();

    expect(JOBS["system.purge-sweep"].schema.parse({})).toEqual({ batchSize: 50 });
    expect(() => JOBS["system.purge-sweep"].schema.parse({ batchSize: 0 })).toThrow();
    expect(() => JOBS["system.purge-sweep"].schema.parse({ batchSize: 201 })).toThrow();
    expect(() => JOBS["system.purge-sweep"].schema.parse({ batchSize: 1.5 })).toThrow();
    expect(() => JOBS["system.purge-sweep"].schema.parse({ extra: true })).toThrow();
  });
});
