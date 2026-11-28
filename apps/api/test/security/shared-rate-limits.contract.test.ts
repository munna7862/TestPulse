import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@testpulse/db";
import type { FastifyInstance } from "fastify";
import { afterAll, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { createRedis } from "../../src/lib/redis";
import { RedisRateLimitStore } from "../../src/modules/auth/rate-limiter";

const prefix = `tp-contract:${randomUUID()}`;
const redisA = createRedis(process.env.REDIS_URL ?? "");
const redisB = createRedis(process.env.REDIS_URL ?? "");
const db = createPrismaClient(process.env.DATABASE_URL_TEST ?? "postgresql://localhost/testpulse");
const apps: FastifyInstance[] = [];

afterAll(async () => {
  try {
    await Promise.all(apps.map((app) => app.close()));
    const keys = await redisA.keys(`${prefix}:*`);
    if (keys.length) await redisA.del(...keys);
  } finally {
    redisA.disconnect();
    redisB.disconnect();
    await db.$disconnect();
  }
});

it("[SC-AUTH-025] enforces an OAuth budget across separate Redis connections", async () => {
  const env = loadApiEnv({ NODE_ENV: "test", OAUTH_RATE_LIMIT_PER_MINUTE: "1" });
  const first = await buildApp({ env, db, logger: false, rateLimitStore: new RedisRateLimitStore(redisA, prefix) });
  apps.push(first);
  const second = await buildApp({ env, db, logger: false, rateLimitStore: new RedisRateLimitStore(redisB, prefix) });
  apps.push(second);
  const request = { url: "/api/v1/auth/oauth/google/start", remoteAddress: "203.0.113.10" };
  expect((await first.inject(request)).statusCode).toBe(302);
  const limited = await second.inject(request);
  expect(limited.statusCode).toBe(429);
  expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
});
