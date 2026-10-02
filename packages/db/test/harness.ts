/**
 * Integration-test database harness (exported as `@testpulse/db/testing`).
 *
 * Each test FILE gets a fresh database (`tp_test_w<pool id>`) with all migrations applied, so files are
 * isolated without transaction-rollback tricks (docs/testing/testing-strategy.md §2.1). Requires the
 * globalSetup from `test/global-setup.ts` in the consuming workspace's Vitest config.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, inject } from "vitest";
import { createPrismaClient, type PrismaClient } from "../src/client";
import "./provided-context";

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../prisma/migrations");

function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

async function applyMigrations(databaseUrl: string): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const dirs = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const dir of dirs) {
      await client.query(readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8"));
    }
  } finally {
    await client.end();
  }
}

/** Drops and recreates this worker's database, applies migrations, and returns its URL. */
export async function createFreshTestDatabase(): Promise<string> {
  const adminUrl = inject("pgAdminUrl");
  const database = `tp_test_w${process.env.VITEST_POOL_ID ?? "0"}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.end();
  }
  const url = withDatabase(adminUrl, database);
  await applyMigrations(url);
  return url;
}

/** Removes all rows from every application table (keeps the schema). */
export async function truncateAll(db: PrismaClient): Promise<void> {
  const rows = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"public"."${row.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

export interface TestDatabase {
  /** Unscoped client for arranging test data (tests act as the "system"). */
  readonly db: PrismaClient;
  readonly url: string;
}

/**
 * Registers beforeAll/afterAll hooks that provide a fresh, migrated database for the current test file.
 * Usage: `const testDb = useTestDatabase();` then `testDb.db` inside tests.
 */
export function useTestDatabase(): TestDatabase {
  let db: PrismaClient | undefined;
  let url: string | undefined;

  beforeAll(async () => {
    url = await createFreshTestDatabase();
    db = createPrismaClient(url);
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  return {
    get db() {
      if (!db) throw new Error("Test database is not ready (use inside tests/hooks).");
      return db;
    },
    get url() {
      if (!url) throw new Error("Test database is not ready (use inside tests/hooks).");
      return url;
    },
  };
}
