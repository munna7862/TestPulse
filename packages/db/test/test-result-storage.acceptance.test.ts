import pg from "pg";
import { expect, it } from "vitest";
import { scopeTenantArgs } from "../src/tenant-scope";
import { createFreshTestDatabase, dropTestDatabase, useTestDatabase } from "./harness";

const database = useTestDatabase();

async function seedRuns(client: pg.Client) {
  await client.query(`
    INSERT INTO "Organization" (id, name, slug, "updatedAt")
      VALUES ('org-a', 'A', 'org-a', now()), ('org-b', 'B', 'org-b', now());
    INSERT INTO "Project" (id, "orgId", name, slug, "updatedAt")
      VALUES ('project-a', 'org-a', 'A', 'a', now()), ('project-sibling', 'org-a', 'Sibling', 's', now()),
      ('project-foreign', 'org-b', 'B', 'b', now());
    INSERT INTO "TestRun" (id, "projectId", "runNumber", "externalRunId", branch, "commitSha", "ciProvider",
      runner, "reporterVersion", "shardTotal", "startedAt", "lastActivityAt", "updatedAt")
    SELECT 'run-' || id, id, 1, 'ci-1', 'main', 'abc1234', 'local', 'playwright', '1', 1, now(), now(), now()
    FROM "Project";
  `);
}

it("[SC-ING-018] upgrades S-010 data and adds execution enums and ordered indexes", async () => {
  let seeded = false;
  const url = await createFreshTestDatabase(async (name, client) => {
    if (seeded || name <= "20261128193000_test_run_storage") return;
    await seedRuns(client);
    seeded = true;
  });
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    const { rows: statuses } = await client.query<{ value: string }>(
      `SELECT unnest(enum_range(NULL::"ResultStatus"))::text AS value`,
    );
    const { rows: states } = await client.query<{ value: string }>(
      `SELECT unnest(enum_range(NULL::"FlakyState"))::text AS value`,
    );
    expect(statuses.map(({ value }) => value)).toEqual(["PASSED", "FAILED", "SKIPPED", "FLAKY"]);
    expect(states.map(({ value }) => value)).toEqual(["STABLE", "SUSPECTED", "FLAKY"]);
    expect((await client.query('SELECT id FROM "TestRun" ORDER BY id')).rowCount).toBe(3);
    const { rows } = await client.query<{ indexdef: string }>(
      "SELECT indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename IN ($2, $3)",
      ["public", "TestResult", "TestCase"],
    );
    expect(rows.map(({ indexdef }) => indexdef)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\("runId", status\)$/),
        expect.stringMatching(/\("testCaseId", "createdAt"\)$/),
        expect.stringMatching(/\("projectId", "createdAt"\)$/),
        expect.stringMatching(/\("projectId", "flakyState"\)$/),
        expect.stringMatching(/\("projectId", "isQuarantined"\)$/),
      ]),
    );
  } finally {
    await client.end();
    await dropTestDatabase(url);
  }
});

it("[SC-ING-019] enforces identity, same-project references, and isolated cascades in PostgreSQL", async () => {
  const client = new pg.Client({ connectionString: database.url });
  try {
    await client.connect();
    await seedRuns(client);
    const suite = (id: string, projectId: string) =>
      client.query(
        'INSERT INTO "TestSuite" (id, "projectId", "filePath", name, "updatedAt") VALUES ($1, $2, $3, $4, now())',
        [id, projectId, "tests/a.spec.ts", "Suite"],
      );
    const testCase = (id: string, projectId: string, suiteId: string, identifier = "identity") =>
      client.query(
        `
      INSERT INTO "TestCase" (id, "projectId", "suiteId", identifier, title, "titlePath", "lastStatus", "lastSeenAt", "updatedAt")
      VALUES ($1, $2, $3, $4, 'Test', ARRAY['Test'], 'PASSED', now(), now())
    `,
        [id, projectId, suiteId, identifier],
      );
    const result = (id: string, projectId: string, runId: string, caseId: string) =>
      client.query(
        `
      INSERT INTO "TestResult" (id, "projectId", "runId", "testCaseId", status, "retryCount", "durationMs", "shardIndex")
      VALUES ($1, $2, $3, $4, 'PASSED', 0, 10, 1)
    `,
        [id, projectId, runId, caseId],
      );
    for (const project of ["project-a", "project-sibling", "project-foreign"]) {
      await suite(`suite-${project}`, project);
      await testCase(`case-${project}`, project, `suite-${project}`);
      await result(`result-${project}`, project, `run-${project}`, `case-${project}`);
    }
    await expect(suite("duplicate-suite", "project-a")).rejects.toMatchObject({
      code: "23505",
      constraint: "TestSuite_projectId_filePath_key",
    });
    await expect(testCase("duplicate-case", "project-a", "suite-project-a")).rejects.toMatchObject({
      code: "23505",
      constraint: "TestCase_projectId_identifier_key",
    });
    await expect(result("duplicate-result", "project-a", "run-project-a", "case-project-a")).rejects.toMatchObject({
      code: "23505",
      constraint: "TestResult_runId_testCaseId_key",
    });
    await expect(
      testCase("mismatched-case", "project-a", "suite-project-sibling", "mismatched-identity"),
    ).rejects.toMatchObject({
      code: "23503",
    });
    await expect(result("mismatched-run", "project-a", "run-project-sibling", "case-project-a")).rejects.toMatchObject({
      code: "23503",
    });
    await expect(
      result("mismatched-result-case", "project-a", "run-project-a", "case-project-foreign"),
    ).rejects.toMatchObject({ code: "23503" });
    await client.query('DELETE FROM "TestRun" WHERE id = $1', ["run-project-a"]);
    expect((await client.query('SELECT id FROM "TestResult" WHERE "projectId" = $1', ["project-a"])).rowCount).toBe(0);
    await client.query('DELETE FROM "Project" WHERE id = $1', ["project-sibling"]);
    expect((await client.query('SELECT id FROM "TestResult" ORDER BY id')).rows).toEqual([
      { id: "result-project-foreign" },
    ]);
    expect((await client.query('SELECT id FROM "TestCase" WHERE "projectId" = $1', ["project-sibling"])).rowCount).toBe(
      0,
    );
    expect(
      (await client.query('SELECT id FROM "TestSuite" WHERE "projectId" = $1', ["project-sibling"])).rowCount,
    ).toBe(0);
  } finally {
    await client.end();
  }
});

it("[SC-SEC-004] scopes execution delegates and rejects nested access and ownership reassignment", () => {
  const ctx = { orgId: "org-a", projectId: "project-a" };
  for (const model of ["TestSuite", "TestCase", "TestResult"]) {
    expect(scopeTenantArgs(model, "findMany", {}, ctx)).toEqual({ where: { projectId: "project-a" } });
    expect(() => scopeTenantArgs(model, "updateMany", { data: { projectId: "project-foreign" } }, ctx)).toThrow(
      /ownership/i,
    );
    expect(() => scopeTenantArgs(model, "findMany", {}, { orgId: ctx.orgId })).toThrow(/missing projectId/);
  }
  expect(() => scopeTenantArgs("Project", "findMany", { where: { testSuites: { some: {} } } }, ctx)).toThrow();
  expect(() => scopeTenantArgs("TestRun", "findMany", { include: { _count: true } }, ctx)).toThrow();
  expect(() => scopeTenantArgs("TestSuite", "create", { data: { testCases: { create: {} } } }, ctx)).toThrow();
});
