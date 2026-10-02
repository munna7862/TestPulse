import { ApiFailureSchema, apiSuccess, HealthSchema } from "@testpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { buildApp } from "../src/app";
import { loadApiEnv } from "../src/env";

const env = loadApiEnv({ NODE_ENV: "test" });

describe("API app", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ env, logger: false });
    app.post("/__test/echo", { schema: { body: z.object({ name: z.string().min(2) }) } }, async (request) => ({
      success: true,
      data: request.body,
    }));
    app.get("/__test/boom", async () => {
      throw new Error("database password=hunter2 leaked?");
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("[SC-OPS-001] GET /health returns the standard envelope with dependency status", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toMatch(/^req_/);
    const body = apiSuccess(HealthSchema).parse(response.json());
    expect(body.data.status).toBe("ok");
    expect(body.data.dependencies).toEqual({ database: "not_configured", redis: "not_configured" });
  });

  it("returns 503 and status degraded when the database is down", async () => {
    const degraded = await buildApp({ env, logger: false, health: { database: async () => "down" } });
    const response = await degraded.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(503);
    expect(apiSuccess(HealthSchema).parse(response.json()).data.status).toBe("degraded");
    await degraded.close();
  });

  it("maps Zod validation failures to 400 VALIDATION_ERROR with details", async () => {
    const response = await app.inject({ method: "POST", url: "/__test/echo", payload: { name: "x" } });
    expect(response.statusCode).toBe(400);
    const body = ApiFailureSchema.parse(response.json());
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
  });

  it("hides internal error details behind 500 INTERNAL", async () => {
    const response = await app.inject({ method: "GET", url: "/__test/boom" });
    expect(response.statusCode).toBe(500);
    const body = ApiFailureSchema.parse(response.json());
    expect(body.error.code).toBe("INTERNAL");
    expect(response.body).not.toContain("hunter2");
  });

  it("returns the envelope for unknown routes", async () => {
    const response = await app.inject({ method: "GET", url: "/nope" });
    expect(response.statusCode).toBe(404);
    expect(ApiFailureSchema.parse(response.json()).error.code).toBe("NOT_FOUND");
  });
});
