import { expect, it } from "vitest";
import { createTenantDb } from "../src/tenant-client";
import { useTestDatabase } from "./harness";

const database = useTestDatabase();

it("[SC-SEC-004] uses the scoped Prisma delegates and confines suite cascades to the project", async () => {
  const { db } = database;
  const org = await db.organization.create({ data: { name: "Example", slug: "example" } });
  const first = await db.project.create({ data: { orgId: org.id, name: "A", slug: "a" } });
  const sibling = await db.project.create({ data: { orgId: org.id, name: "B", slug: "b" } });
  async function createExecution(projectId: string) {
    const tenant = createTenantDb(db, { orgId: org.id, projectId });
    const run = await tenant.testRun.create({
      data: {
        projectId,
        runNumber: 1,
        externalRunId: "fixture",
        branch: "main",
        commitSha: "abc1234",
        ciProvider: "local",
        runner: "playwright",
        reporterVersion: "1",
        shardTotal: 1,
        startedAt: new Date(0),
        lastActivityAt: new Date(0),
      },
    });
    const suite = await tenant.testSuite.create({ data: { projectId, filePath: "tests/a.spec.ts", name: "Suite" } });
    const testCase = await tenant.testCase.create({
      data: {
        projectId,
        suiteId: suite.id,
        identifier: "fixture",
        title: "Example",
        titlePath: ["Suite", "Example"],
        tags: ["fixture"],
        labels: ["triage"],
        runnerProject: "chromium",
        lastStatus: "FLAKY",
        lastSeenAt: new Date(0),
      },
    });
    const result = await tenant.testResult.create({
      data: {
        projectId,
        runId: run.id,
        testCaseId: testCase.id,
        status: "FLAKY",
        retryCount: 1,
        durationMs: 10,
        shardIndex: 1,
        errorMessage: "Initial failure",
        stackTrace: "fixture trace",
      },
    });
    return { tenant, run, suite, testCase, result };
  }

  const own = await createExecution(first.id);
  const other = await createExecution(sibling.id);
  const { tenant } = own;
  await expect(tenant.testRun.aggregate({ _count: true })).resolves.toEqual({ _count: 1 });
  await expect(tenant.testRun.groupBy({ by: ["status"], _count: true })).resolves.toEqual([
    { status: "RUNNING", _count: 1 },
  ]);
  await expect(tenant.testSuite.findFirst({ where: { id: other.suite.id } })).resolves.toBeNull();
  await expect(tenant.testCase.findFirst({ where: { id: other.testCase.id } })).resolves.toBeNull();
  await expect(tenant.testResult.findFirst({ where: { id: other.result.id } })).resolves.toBeNull();
  await expect(
    tenant.testCase.updateMany({ where: { id: other.testCase.id }, data: { title: "Other" } }),
  ).resolves.toEqual({ count: 0 });
  await expect(tenant.testResult.deleteMany({ where: { id: other.result.id } })).resolves.toEqual({ count: 0 });
  await expect(tenant.testCase.findFirst({ where: { id: own.testCase.id } })).resolves.toMatchObject({
    tags: ["fixture"],
    labels: ["triage"],
    runnerProject: "chromium",
    flakyState: "STABLE",
    flakyScore: 0,
    isQuarantined: false,
  });
  await expect(
    tenant.testResult.findFirst({ where: { id: own.result.id }, include: { testCase: true, run: true } }),
  ).resolves.toMatchObject({
    status: "FLAKY",
    retryCount: 1,
    errorMessage: "Initial failure",
    stackTrace: "fixture trace",
    testCase: { id: own.testCase.id },
    run: { id: own.run.id },
  });
  await expect(tenant.testRun.findFirst({ where: { id: own.run.id }, include: { testResults: true } })).rejects.toThrow(
    /project-scoped delegates/,
  );
  await expect(tenant.testRun.findFirst({ where: { id: own.run.id }, include: { _count: true } })).rejects.toThrow(
    /project-scoped delegates/,
  );
  await expect(tenant.project.findMany({ where: { testSuites: { some: {} } } })).rejects.toThrow(
    /project-scoped delegates/,
  );
  await expect(
    tenant.testSuite.updateMany({ where: { id: own.suite.id }, data: { projectId: sibling.id } }),
  ).rejects.toThrow(/ownership/i);
  const indexes = await db.$queryRaw<{ indexdef: string }[]>`
    SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'TestCase_suiteId_idx'
  `;
  expect(indexes[0]?.indexdef).toMatch(/\("suiteId"\)$/);
  await expect(tenant.testSuite.deleteMany({ where: { id: other.suite.id } })).resolves.toEqual({ count: 0 });
  await expect(tenant.testSuite.deleteMany({ where: { id: own.suite.id } })).resolves.toEqual({ count: 1 });
  expect(await tenant.testResult.count()).toBe(0);
  expect(await other.tenant.testResult.count()).toBe(1);
});
