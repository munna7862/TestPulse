import pg from "pg";
import { afterAll, describe, expect, it, inject } from "vitest";
import { createFreshTestDatabase, dropTestDatabase, useTestDatabase } from "./harness";

async function databaseExists(databaseName: string): Promise<boolean> {
  const admin = new pg.Client({ connectionString: inject("pgAdminUrl") });
  await admin.connect();
  try {
    const result = await admin.query<{ datname: string }>("SELECT datname FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);
    return result.rows.length > 0;
  } finally {
    await admin.end();
  }
}

describe("test database harness isolation", () => {
  it("gives concurrent calls distinct databases without colliding and drops them cleanly", async () => {
    const [urlA, urlB] = await Promise.all([createFreshTestDatabase(), createFreshTestDatabase()]);
    const dbA = new URL(urlA).pathname.replace(/^\/+/, "");
    const dbB = new URL(urlB).pathname.replace(/^\/+/, "");

    try {
      expect(dbA).toMatch(/^tp_test_[a-z0-9_]+$/);
      expect(dbB).toMatch(/^tp_test_[a-z0-9_]+$/);
      expect(dbA).not.toBe(dbB);
    } finally {
      await Promise.all([dropTestDatabase(urlA), dropTestDatabase(urlB)]);
    }

    expect(await databaseExists(dbA)).toBe(false);
    expect(await databaseExists(dbB)).toBe(false);
  });

  it("refuses to drop non-test, empty or malformed database names", async () => {
    await expect(dropTestDatabase("postgresql://postgres:postgres@127.0.0.1:5432/postgres")).rejects.toThrow(
      /Refusing to operate on non-test database/,
    );
    await expect(dropTestDatabase("postgresql://postgres:postgres@127.0.0.1:5432/")).rejects.toThrow(
      /Refusing to operate on non-test database/,
    );
    await expect(dropTestDatabase("postgresql://postgres:postgres@127.0.0.1:5432/tp_test_ABC")).rejects.toThrow(
      /Refusing to operate on non-test database/,
    );
    await expect(dropTestDatabase('postgresql://postgres:postgres@127.0.0.1:5432/tp_test_bad"name')).rejects.toThrow(
      /Refusing to operate on non-test database/,
    );
  });

  describe("useTestDatabase afterAll cleanup", () => {
    let createdDbName: string | undefined;

    describe("inner suite", () => {
      const inner = useTestDatabase();
      it("provisions a live database and records its name", async () => {
        createdDbName = new URL(inner.url).pathname.replace(/^\/+/, "");
        expect(await databaseExists(createdDbName)).toBe(true);
      });
    });

    afterAll(async () => {
      if (!createdDbName) throw new Error("Expected inner suite to record createdDbName");
      expect(await databaseExists(createdDbName)).toBe(false);
    });
  });
});
