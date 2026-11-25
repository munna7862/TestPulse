import pg from "pg";
import { describe, expect, it, inject } from "vitest";
import { createFreshTestDatabase, dropTestDatabase } from "./harness";

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

    const admin = new pg.Client({ connectionString: inject("pgAdminUrl") });
    await admin.connect();
    try {
      const remaining = await admin.query<{ datname: string }>(
        "SELECT datname FROM pg_database WHERE datname = ANY($1::text[])",
        [[dbA, dbB]],
      );
      expect(remaining.rows).toEqual([]);
    } finally {
      await admin.end();
    }
  });

  it("refuses to drop non-test or malformed database names", async () => {
    await expect(dropTestDatabase("postgresql://postgres:postgres@127.0.0.1:5432/postgres")).rejects.toThrow(
      /Refusing to operate on non-test database/,
    );
    await expect(dropTestDatabase('postgresql://postgres:postgres@127.0.0.1:5432/tp_test_bad"name')).rejects.toThrow(
      /Refusing to operate on non-test database/,
    );
  });
});
