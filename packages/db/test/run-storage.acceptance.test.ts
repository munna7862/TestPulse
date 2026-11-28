import { afterAll, expect, it } from "vitest";
import { createPrismaClient } from "../src/client";
import { scopeTenantArgs } from "../src/tenant-scope";
import { createFreshTestDatabase, dropTestDatabase, useTestDatabase } from "./harness";

const database = useTestDatabase();
const ctx = { orgId: "org-a", projectId: "project-a" };
let upgradeUrl: string | undefined;
afterAll(async () => {
  if (upgradeUrl) await dropTestDatabase(upgradeUrl);
});

it("[SC-ING-016] migrates populated Phase 03 data and installs run status and indexes", async () => {
  let seeded = false;
  upgradeUrl = await createFreshTestDatabase(async (migration, client) => {
    if (seeded || migration <= "20261126150000_audit_events") return;
    seeded = true;
    await client.query(`
      INSERT INTO "User" (id, email, name, "updatedAt") VALUES ('owner', 'owner@example.com', 'Owner', now());
      INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ('existing-org', 'Existing', 'existing', now());
      INSERT INTO "Project" (id, "orgId", name, slug, "runCounter", "updatedAt")
        VALUES ('existing-project', 'existing-org', 'Existing', 'existing', 7, now());
      INSERT INTO "ApiKey" (id, "orgId", "projectId", name, prefix, "keyHash", "createdById", "updatedAt")
        VALUES ('key', 'existing-org', 'existing-project', 'Existing', 'fixture', 'fixture-hash', 'owner', now());
      INSERT INTO "AuditEvent" (id, "orgId", "projectId", action, "targetType", "targetId")
        VALUES ('event', 'existing-org', 'existing-project', 'project.created', 'Project', 'existing-project');
    `);
  });
  const db = createPrismaClient(upgradeUrl);
  try {
    const statuses = await db.$queryRaw<
      { status: string }[]
    >`SELECT unnest(enum_range(NULL::"RunStatus"))::text AS status`;
    expect(statuses.map(({ status }) => status)).toEqual(["RUNNING", "PASSED", "FAILED", "CANCELLED", "TIMED_OUT"]);
    const indexes = await db.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'TestRun'
    `;
    expect(indexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        "TestRun_projectId_createdAt_idx",
        "TestRun_projectId_branch_createdAt_idx",
        "TestRun_status_lastActivityAt_idx",
      ]),
    );
    expect(await db.user.count({ where: { id: "owner" } })).toBe(1);
    expect(await db.organization.count({ where: { id: "existing-org" } })).toBe(1);
    expect(await db.project.findFirst({ where: { id: "existing-project" }, select: { runCounter: true } })).toEqual({
      runCounter: 7,
    });
    expect(await db.apiKey.count({ where: { id: "key", projectId: "existing-project" } })).toBe(1);
    expect(await db.auditEvent.count({ where: { id: "event", projectId: "existing-project" } })).toBe(1);
  } finally {
    await db.$disconnect();
  }
});

it("[SC-ING-017] enforces both project-local identities and cascades only the deleted project's runs", async () => {
  const { db } = database;
  const org = await db.organization.create({ data: { slug: "storage-org", name: "Storage" } });
  const first = await db.project.create({ data: { orgId: org.id, slug: "first", name: "First" } });
  const second = await db.project.create({ data: { orgId: org.id, slug: "second", name: "Second" } });
  const insert = (id: string, projectId: string, runNumber: number, externalRunId: string) => db.$executeRaw`
    INSERT INTO "TestRun" (id, "projectId", "runNumber", "externalRunId", branch, "commitSha", "ciProvider", runner,
      "reporterVersion", "shardTotal", "startedAt", "lastActivityAt", "updatedAt")
    VALUES (${id}, ${projectId}, ${runNumber}, ${externalRunId}, 'main', 'abc1234', 'local', 'playwright', '0.0.0', 1, now(), now(), now())
  `;
  await insert("first-run", first.id, 1, "ci-1");
  await expect(insert("duplicate-external", first.id, 2, "ci-1")).rejects.toMatchObject({
    meta: {
      driverAdapterError: {
        cause: { originalCode: "23505", constraint: { index: "TestRun_projectId_externalRunId_key" } },
      },
    },
  });
  await expect(insert("duplicate-number", first.id, 1, "ci-2")).rejects.toMatchObject({
    meta: {
      driverAdapterError: {
        cause: { originalCode: "23505", constraint: { index: "TestRun_projectId_runNumber_key" } },
      },
    },
  });
  await insert("second-run", second.id, 1, "ci-1");
  await db.project.delete({ where: { id: first.id } });
  expect(await db.$queryRaw`SELECT id FROM "TestRun"`).toEqual([{ id: "second-run" }]);
});

it("[SC-SEC-004] pins run selection and refuses foreign ownership and indirect relation access", () => {
  const where = { id: "foreign-run" };
  for (const operation of ["findMany", "updateMany", "deleteMany"]) {
    expect(scopeTenantArgs("TestRun", operation, { where }, ctx)).toEqual({
      where: { AND: [where, { projectId: ctx.projectId }] },
    });
  }
  expect(() => scopeTenantArgs("TestRun", "findMany", {}, { orgId: ctx.orgId })).toThrow(/missing projectId/);
  expect(() => scopeTenantArgs("TestRun", "create", { data: { projectId: "foreign" } }, ctx)).toThrow(
    /Cross-tenant write/,
  );
  expect(() => scopeTenantArgs("TestRun", "updateMany", { data: { projectId: "foreign" } }, ctx)).toThrow(/ownership/i);
  expect(() =>
    scopeTenantArgs("TestRun", "create", { data: { project: { connect: { id: "foreign" } } } }, ctx),
  ).toThrow(/ownership/i);
  expect(() =>
    scopeTenantArgs("Project", "findMany", { include: { _count: { select: { testRuns: true } } } }, ctx),
  ).toThrow(/TestRun/);
  expect(() =>
    scopeTenantArgs("Project", "findMany", { where: { org: { projects: { some: { testRuns: { some: {} } } } } } }, ctx),
  ).toThrow(/TestRun/);
  expect(() => scopeTenantArgs("Project", "create", { data: { testRuns: { create: {} } } }, ctx)).toThrow(/TestRun/);
});
