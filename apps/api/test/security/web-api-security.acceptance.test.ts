import { randomUUID } from "node:crypto";
import { useTestDatabase } from "@testpulse/db/testing";
import { ApiFailureSchema } from "@testpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { MemoryRateLimitStore, type RateLimitStore } from "../../src/modules/auth/rate-limiter";
import { callAs, createUser } from "../orgs/helpers";

const testDb = useTestDatabase();
const origin = "https://testpulse.example.com";
const baseEnv = {
  NODE_ENV: "test",
  WEB_ORIGIN: origin,
  OAUTH_RATE_LIMIT_PER_MINUTE: "1",
  AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: "1",
};
const oauthStart = "/api/v1/auth/oauth/google/start";
const apps: FastifyInstance[] = [];

async function createApp(overrides: Record<string, string> = {}, store?: RateLimitStore) {
  const app = await buildApp({
    env: loadApiEnv({ ...baseEnv, ...overrides }),
    db: testDb.db,
    mailer: new TestMailer(),
    logger: false,
    ...(store ? { rateLimitStore: store } : {}),
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

it("[SC-SEC-005] sets JSON security headers and permits requests without Origin", async () => {
  const app = await createApp();
  const response = await app.inject({ url: "/health" });
  expect(response.statusCode).toBe(200);
  expect(response.headers["x-content-type-options"]).toBe("nosniff");
  expect(response.headers["referrer-policy"]).toBe("no-referrer");
  expect(response.headers["access-control-allow-origin"]).toBeUndefined();
});

it("[SC-SEC-005] allows credentialed preflight only for the configured web origin", async () => {
  const app = await createApp();
  const preflight = (requestOrigin: string) =>
    app.inject({
      method: "OPTIONS",
      url: "/api/v1/auth/login",
      headers: { origin: requestOrigin, "access-control-request-method": "POST" },
    });
  const allowed = await preflight(origin);
  expect(allowed.statusCode).toBe(204);
  expect(allowed.headers["access-control-allow-origin"]).toBe(origin);
  expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
  expect(allowed.headers.vary).toMatch(/\borigin\b/i);
  for (const denied of ["https://other.example.com", "http://localhost:4000", "null"]) {
    const response = await preflight(denied);
    expect(Object.keys(response.headers).filter((header) => header.startsWith("access-control-allow-"))).toEqual([]);
  }
});

it("[SC-AUTH-017] separates verified proxy clients and keeps direct-request address selection", async () => {
  const credential = randomUUID();
  const app = await createApp({ WEB_PROXY_SHARED_SECRET: credential });
  const login = (address: string, proof?: string) =>
    app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: "203.0.113.1",
      headers: { "x-testpulse-client-ip": address, ...(proof ? { "x-testpulse-proxy-secret": proof } : {}) },
      payload: { email: `${randomUUID()}@example.com`, password: "InvalidPassword!" },
    });

  expect((await login("198.51.100.10", credential)).statusCode).toBe(401);
  expect((await login("198.51.100.10", credential)).statusCode).toBe(429);
  expect((await login("198.51.100.20", credential)).statusCode).toBe(401);
  expect((await login("198.51.100.30")).statusCode).toBe(401);
  expect((await login("198.51.100.40", randomUUID())).statusCode).toBe(429);
});

it("[SC-AUTH-025] shares the OAuth start and callback budget across app instances", async () => {
  const sharedStore = new MemoryRateLimitStore();
  const first = await createApp({}, sharedStore);
  const second = await createApp({}, sharedStore);
  const remoteAddress = "203.0.113.2";
  expect((await first.inject({ url: oauthStart, remoteAddress })).statusCode).toBe(302);

  const blocked = await second.inject({ url: "/api/v1/auth/oauth/github/callback", remoteAddress });
  expect(blocked.statusCode).toBe(429);
  expect(ApiFailureSchema.parse(blocked.json()).error.code).toBe("RATE_LIMITED");
  expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
  expect((await second.inject({ url: oauthStart, remoteAddress: "203.0.113.3" })).statusCode).toBe(302);
});

it("[SC-AUTH-025] returns a temporary error when OAuth cannot check its budget", async () => {
  const app = await createApp({}, { hit: () => Promise.reject(new Error("Store unavailable")) });
  const response = await app.inject({ url: oauthStart });
  expect(response.statusCode).toBe(503);
  expect(ApiFailureSchema.parse(response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  expect((await app.inject({ url: "/health" })).statusCode).toBe(200);
});

it("[SC-SEC-012] enforces a shared authenticated REST budget by user and continues during a store outage", async () => {
  const seenKeys = new Set<string>();
  let unavailable = false;
  const store: RateLimitStore = {
    async hit(key, windowMs) {
      if (!key.startsWith("rest:")) return { count: 1, resetMs: windowMs };
      if (unavailable) throw new Error("Store unavailable");
      const count = seenKeys.has(key) ? 601 : 600;
      seenKeys.add(key);
      return { count, resetMs: windowMs };
    },
  };
  const first = await createApp({}, store);
  const second = await createApp({}, store);
  const loginApp = await createApp({ AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: "10" });
  const user = await createUser(loginApp, testDb.db, `${randomUUID()}@example.com`);
  const other = await createUser(loginApp, testDb.db, `${randomUUID()}@example.com`);

  expect((await callAs(first, user, "GET", "/api/v1/auth/me")).statusCode).toBe(200);
  const blocked = await callAs(second, user, "GET", "/api/v1/auth/me");
  expect(blocked.statusCode).toBe(429);
  expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
  expect((await callAs(second, other, "GET", "/api/v1/auth/me")).statusCode).toBe(200);
  unavailable = true;
  expect((await callAs(second, user, "GET", "/api/v1/auth/me")).statusCode).toBe(200);
});
