import { checkDatabase } from "@testpulse/db";
import { useTestDatabase } from "@testpulse/db/testing";
import { apiSuccess, HealthSchema } from "@testpulse/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { loadApiEnv } from "../src/env";

const testDb = useTestDatabase();

describe("health with a real database", () => {
  it("[SC-OPS-001] reports database up when PostgreSQL is reachable", async () => {
    const app = await buildApp({
      env: loadApiEnv({ NODE_ENV: "test" }),
      logger: false,
      health: { database: () => checkDatabase(testDb.db) },
    });
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(apiSuccess(HealthSchema).parse(response.json()).data.dependencies.database).toBe("up");
    await app.close();
  });
});
