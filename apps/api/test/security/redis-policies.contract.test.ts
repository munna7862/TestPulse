import { randomBytes, randomUUID } from "node:crypto";
import { useTestDatabase } from "@testpulse/db/testing";
import { API_KEY_LIVE_PREFIX, apiSuccess, OrgSchema } from "@testpulse/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { createRedis } from "../../src/lib/redis";
import { hashApiKey } from "../../src/modules/api-keys/api-keys.service";
import { MemoryRateLimitStore, RedisRateLimitStore, type RateLimitStore } from "../../src/modules/auth/rate-limiter";
import { createApiKeyAuthHook } from "../../src/plugins/api-key-auth";
import { registerErrorHandling } from "../../src/plugins/error-handler";
import { callAs, createUser, ORIGIN, type TestUser } from "../orgs/helpers";

const testDb = useTestDatabase();
const prefix = `tp-contract:${randomUUID()}`;
const options = { failFast: true };
const redisA = createRedis(process.env.REDIS_URL ?? "", options);
const redisB = createRedis(process.env.REDIS_URL ?? "", options);
const unavailable = createRedis("redis://127.0.0.1:1", options);
unavailable.on("error", () => undefined);
const addresses = { password: "198.51.100.21", invite: "127.0.0.1" };
const apps: FastifyInstance[] = [];

async function api(store: RateLimitStore) {
  const app = await buildApp({
    env: loadApiEnv({ NODE_ENV: "test", WEB_ORIGIN: ORIGIN, AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: "1" }),
    db: testDb.db,
    mailer: new TestMailer(),
    logger: false,
    rateLimitStore: store,
  });
  apps.push(app);
  return app;
}

let first: FastifyInstance;
let second: FastifyInstance;
let offline: FastifyInstance;
let user: TestUser;
let orgId: string;

beforeAll(async () => {
  await Promise.all([redisA.connect(), redisB.connect()]);
  first = await api(new RedisRateLimitStore(redisA, prefix));
  second = await api(new RedisRateLimitStore(redisB, prefix));
  offline = await api(new RedisRateLimitStore(unavailable, prefix));
  const fixtures = await api(new MemoryRateLimitStore());
  user = await createUser(fixtures, testDb.db, "contract-owner@example.com");
  const created = await callAs(fixtures, user, "POST", "/api/v1/orgs", { name: "Rate Limit Contract" });
  orgId = apiSuccess(OrgSchema).parse(created.json()).data.id;
});

afterAll(async () => {
  try {
    await Promise.all(apps.map((app) => app.close()));
    if (redisA.status === "ready") {
      const keys = await redisA.keys(`${prefix}:*`);
      if (keys.length) await redisA.del(...keys);
    }
  } finally {
    redisA.disconnect();
    redisB.disconnect();
    unavailable.disconnect();
  }
});

it("[SC-AUTH-017] shares the password login budget and refuses login when Redis is unreachable", async () => {
  const login = (app: FastifyInstance) =>
    app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      remoteAddress: addresses.password,
      payload: { email: "no-session@example.com", password: "InvalidPassword!" },
    });
  expect((await login(first)).statusCode).toBe(401);
  expect((await login(second)).statusCode).toBe(429);
  expect((await login(offline)).statusCode).toBe(503);
});

it("[SC-ORG-013] shares the invitation budget and refuses acceptance when Redis is unreachable", async () => {
  await redisA.set(`${prefix}:invite-accept:ip:${addresses.invite}`, "19", "PX", 60_000);
  const accept = (app: FastifyInstance) =>
    callAs(app, user, "POST", "/api/v1/invitations/accept", { token: randomUUID() });
  expect((await accept(first)).statusCode).toBe(400);
  expect((await accept(second)).statusCode).toBe(429);
  expect((await accept(offline)).statusCode).toBe(503);
});

it("[SC-SEC-012] shares the signed-in budget with tenant routes and continues when Redis is unreachable", async () => {
  await redisA.set(`${prefix}:rest:${user.id}`, "599", "PX", 60_000);
  expect((await callAs(first, user, "GET", "/api/v1/auth/me")).statusCode).toBe(200);
  expect((await callAs(second, user, "GET", `/api/v1/orgs/${orgId}`)).statusCode).toBe(429);
  expect((await callAs(offline, user, "GET", `/api/v1/orgs/${orgId}`)).statusCode).toBe(200);
});

it("[SC-KEY-007] shares the ingestion key and project budgets and continues when Redis is unreachable", async () => {
  const project = await testDb.db.project.create({ data: { orgId, name: "Fixture", slug: "fixture" } });
  const keys = [0, 1].map(() => `${API_KEY_LIVE_PREFIX}${randomBytes(32).toString("hex")}`);
  for (const key of keys) {
    await testDb.db.apiKey.create({
      data: {
        keyHash: hashApiKey(key),
        orgId,
        projectId: project.id,
        name: "Fixture",
        prefix: key.slice(0, 16),
        createdById: user.id,
      },
    });
  }
  const createIngest = (store: RateLimitStore) => {
    const app = Fastify();
    apps.push(app);
    registerErrorHandling(app);
    const hook = createApiKeyAuthHook({
      db: testDb.db,
      rateLimitStore: store,
      perKeyMax: 1,
      perProjectMax: 1,
      windowMs: 60_000,
    });
    app.post("/ingest", { preHandler: hook }, (_request, reply) => reply.code(204).send());
    return app;
  };
  const ingest = (app: FastifyInstance, key: string) =>
    app.inject({ method: "POST", url: "/ingest", headers: { authorization: `Bearer ${key}` } });
  const [one = "", two = ""] = keys;
  const firstApp = createIngest(new RedisRateLimitStore(redisA, prefix));
  const secondApp = createIngest(new RedisRateLimitStore(redisB, prefix));
  expect((await ingest(firstApp, one)).statusCode).toBe(204);
  expect((await ingest(secondApp, one)).statusCode).toBe(429);
  expect((await ingest(secondApp, two)).statusCode).toBe(429);
  expect((await ingest(createIngest(new RedisRateLimitStore(unavailable, prefix)), one)).statusCode).toBe(204);
});
