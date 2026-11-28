import { expect, it } from "vitest";
import { createPrismaClient } from "../src/client";
import { createTenantDb } from "../src/tenant-client";
import { createFreshTestDatabase, dropTestDatabase, useTestDatabase } from "./harness";

const database = useTestDatabase();

it("[SC-SEC-004] scopes Prisma run reads, writes, and relation counts to the project boundary", async () => {
  const { db } = database;
  const org = await db.organization.create({ data: { name: "First", slug: "first-org" } });
  const otherOrg = await db.organization.create({ data: { name: "Other", slug: "other-org" } });
  const projects = await Promise.all(
    [org.id, org.id, otherOrg.id].map((orgId, index) =>
      db.project.create({ data: { orgId, name: `Fixture ${index}`, slug: `fixture-${index}` } }),
    ),
  );
  const clients = projects.map(({ id, orgId }) => createTenantDb(db, { orgId, projectId: id }));
  const runs = await Promise.all(
    clients.map((tenant, index) =>
      tenant.testRun.create({
        data: {
          projectId: projects[index]?.id ?? "",
          runNumber: 1,
          externalRunId: "initial-run",
          branch: "main",
          commitSha: "abc1234",
          ciProvider: "local",
          runner: "playwright",
          runnerVersion: "1.63.0",
          ciJobUrl: "https://ci.example.com/job/1",
          environment: "local",
          finishedAt: new Date(1000),
          durationMs: 1000,
          expectedTestCount: 2,
          reporterVersion: "0.0.0",
          shardTotal: 1,
          startedAt: new Date(0),
          lastActivityAt: new Date(0),
        },
      }),
    ),
  );
  const [tenant] = clients;
  const [own, sibling, foreign] = runs;
  if (!tenant || !own || !sibling || !foreign) throw new Error("Missing run storage fixtures");
  expect(own).toMatchObject({ status: "RUNNING", totalCount: 0, shardsCompleted: 0, quarantineUnblocked: false });
  await expect(tenant.testRun.findFirst({ where: { id: own.id } })).resolves.toMatchObject({
    runnerVersion: "1.63.0",
    ciJobUrl: "https://ci.example.com/job/1",
    environment: "local",
    finishedAt: new Date(1000),
    durationMs: 1000,
    expectedTestCount: 2,
  });
  expect(await tenant.testRun.findMany({ select: { id: true } })).toEqual([{ id: own.id }]);
  for (const run of [sibling, foreign]) {
    const where = { id: run.id };
    await expect(tenant.testRun.findFirst({ where })).resolves.toBeNull();
    await expect(tenant.testRun.updateMany({ where, data: { status: "FAILED" } })).resolves.toEqual({ count: 0 });
    await expect(tenant.testRun.deleteMany({ where })).resolves.toEqual({ count: 0 });
  }
  await expect(
    tenant.testRun.updateMany({ where: { id: own.id }, data: { projectId: foreign.projectId } }),
  ).rejects.toThrow(/ownership/i);
  await expect(tenant.testRun.updateMany({ where: { id: own.id }, data: { status: "PASSED" } })).resolves.toEqual({
    count: 1,
  });
  await expect(tenant.project.findMany({ include: { _count: true } })).rejects.toThrow(/TestRun/);
  await expect(
    tenant.project.updateMany({ where: { id: own.projectId }, data: { orgId: otherOrg.id } }),
  ).rejects.toThrow(/ownership/i);
  await expect(
    tenant.project.updateMany({ where: { id: own.projectId }, data: { id: "different-project" } }),
  ).rejects.toThrow(/ownership/i);
  await expect(tenant.project.deleteMany({ where: { id: sibling.projectId } })).resolves.toEqual({ count: 0 });
  await expect(tenant.organization.deleteMany()).rejects.toThrow(/organization-wide/);
  expect(await db.testRun.count()).toBe(3);
});

it("[SC-ING-016] preserves an existing session and installs run indexes in the canonical column order", async () => {
  let seeded = false;
  const url = await createFreshTestDatabase(async (migration, client) => {
    if (seeded || migration <= "20261126150000_audit_events") return;
    seeded = true;
    await client.query(`
      INSERT INTO "User" (id, email, name, "updatedAt") VALUES ('user', 'user@example.com', 'Owner', now());
      INSERT INTO "Session" (id, "userId", "familyId", "refreshTokenHash", "expiresAt", "updatedAt")
        VALUES ('session', 'user', 'family', 'fixture-hash', '2099-01-01', now());
    `);
  });
  const db = createPrismaClient(url);
  try {
    const indexes = await db.$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'TestRun'
    `;
    const byName = new Map(indexes.map(({ indexname, indexdef }) => [indexname, indexdef]));
    expect(byName.get("TestRun_projectId_createdAt_idx")).toMatch(/\("projectId", "createdAt"\)$/);
    expect(byName.get("TestRun_projectId_branch_createdAt_idx")).toMatch(/\("projectId", branch, "createdAt"\)$/);
    expect(byName.get("TestRun_status_lastActivityAt_idx")).toMatch(/\(status, "lastActivityAt"\)$/);
    await expect(db.session.findUnique({ where: { id: "session" } })).resolves.toMatchObject({
      userId: "user",
      refreshTokenHash: "fixture-hash",
      revokedAt: null,
    });
  } finally {
    await db.$disconnect();
    await dropTestDatabase(url);
  }
});
