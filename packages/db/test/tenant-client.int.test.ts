import { beforeAll, describe, expect, it } from "vitest";
import { checkDatabase, createPrismaClient } from "../src/client";
import { createTenantDb } from "../src/tenant-client";
import { useTestDatabase } from "./harness";

const testDb = useTestDatabase();

describe("tenant-scoped client against PostgreSQL", () => {
  let orgA: string;
  let orgB: string;
  let projectB: string;

  beforeAll(async () => {
    const { db } = testDb;
    orgA = (await db.organization.create({ data: { name: "A", slug: "org-a" } })).id;
    orgB = (await db.organization.create({ data: { name: "B", slug: "org-b" } })).id;
    await db.project.create({ data: { orgId: orgA, name: "A1", slug: "a1" } });
    projectB = (await db.project.create({ data: { orgId: orgB, name: "B1", slug: "b1" } })).id;
  });

  it("[SC-SEC-004] returns only the context org's rows", async () => {
    const tenant = createTenantDb(testDb.db, { orgId: orgA });
    const projects = await tenant.project.findMany();
    expect(projects.map((p) => p.slug)).toEqual(["a1"]);
  });

  it("[SC-SEC-004] cannot read another org's row by id", async () => {
    const tenant = createTenantDb(testDb.db, { orgId: orgA });
    await expect(tenant.project.findFirst({ where: { id: projectB } })).resolves.toBeNull();
  });

  it("[SC-SEC-004] cannot update or delete another org's rows", async () => {
    const tenant = createTenantDb(testDb.db, { orgId: orgA });
    await expect(tenant.project.updateMany({ where: { id: projectB }, data: { name: "pwned" } })).resolves.toEqual({
      count: 0,
    });
    await expect(tenant.project.deleteMany({ where: { id: projectB } })).resolves.toEqual({ count: 0 });
    const untouched = await testDb.db.project.findFirstOrThrow({ where: { id: projectB } });
    expect(untouched.name).toBe("B1");
  });

  it("[SC-SEC-004] stamps orgId on create and blocks cross-tenant create", async () => {
    const tenant = createTenantDb(testDb.db, { orgId: orgA });
    const created = await tenant.project.create({ data: { name: "A2", slug: "a2", orgId: orgA } });
    expect(created.orgId).toBe(orgA);
    await expect(tenant.project.create({ data: { name: "X", slug: "x", orgId: orgB } })).rejects.toThrow(
      /Cross-tenant write blocked/,
    );
  });

  it("[SC-SEC-004] rejects findUnique and global models", async () => {
    const tenant = createTenantDb(testDb.db, { orgId: orgA });
    await expect(tenant.project.findUnique({ where: { id: projectB } })).rejects.toThrow(/not allowed/);
    await expect(tenant.user.findMany()).rejects.toThrow(/global table/);
  });

  it("[SC-OPS-001] checkDatabase reports up for a live database and down for an unreachable one", async () => {
    expect(await checkDatabase(testDb.db)).toBe("up");
    const unreachable = createPrismaClient("postgresql://postgres:postgres@127.0.0.1:1/none");
    expect(await checkDatabase(unreachable, 1_000)).toBe("down");
    await unreachable.$disconnect();
  });
});
