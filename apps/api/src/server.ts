import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { checkDatabase, createPrismaClient } from "@testpulse/db";
import { buildApp } from "./app";
import { loadApiEnv } from "./env";
import { checkRedis, createRedis } from "./lib/redis";
import { RedisRateLimitStore, type RateLimitStore } from "./modules/auth/rate-limiter";
import { createQueueClient } from "./queues/registry";
import { startWorkers, type WorkerHandle } from "./worker";

// Local development convenience: load apps/api/.env if present (never in production).
if (process.env.NODE_ENV !== "production" && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const env = loadApiEnv();
const db = env.DATABASE_URL ? createPrismaClient(env.DATABASE_URL) : undefined;
const redis = env.REDIS_URL ? createRedis(env.REDIS_URL) : undefined;
// Fail-fast producer connection so HTTP handlers (e.g. soft-delete enqueue) never stall on a Redis outage.
const queueRedis = env.REDIS_URL ? createRedis(env.REDIS_URL, { failFast: true }) : undefined;
queueRedis?.connect().catch((error: unknown) => {
  console.error("Queue Redis connection failed; background sweep will catch up until it recovers", error);
});
const queueClient = queueRedis
  ? createQueueClient(queueRedis, "tp", {
      onError: (error) => console.error("Queue Redis error", error),
    })
  : undefined;
// Separate fail-fast client for auth rate limits; with no offline queue it must be connected explicitly.
const limiterRedis = env.REDIS_URL ? createRedis(env.REDIS_URL, { failFast: true }) : undefined;
limiterRedis?.connect().catch((error: unknown) => {
  console.error("Rate-limit Redis connection failed; auth routes return 503 until it recovers", error);
});

const rateLimitStore: RateLimitStore | undefined = limiterRedis
  ? new RedisRateLimitStore(limiterRedis)
  : env.NODE_ENV === "production"
    ? { hit: () => Promise.reject(new Error("REDIS_URL is not configured")) }
    : undefined;

const app = await buildApp({
  env,
  ...(db ? { db } : {}),
  ...(queueClient ? { queueClient } : {}),
  ...(rateLimitStore ? { rateLimitStore } : {}),
  health: {
    ...(db ? { database: () => checkDatabase(db) } : {}),
    ...(redis ? { redis: () => checkRedis(redis) } : {}),
  },
});

const workerStartupAbort = new AbortController();
let workerStartup: Promise<WorkerHandle | undefined> | undefined;
async function startInProcessWorkers(): Promise<WorkerHandle | undefined> {
  const { signal } = workerStartupAbort;
  while (!signal.aborted) {
    try {
      return await startWorkers({ log: app.log, redisUrl: env.REDIS_URL, signal, ...(db ? { db } : {}) });
    } catch (error) {
      if (signal.aborted) return undefined;
      app.log.warn({ err: error }, "worker startup failed; retrying");
      await delay(5_000, undefined, { signal }).catch(() => undefined);
    }
  }
  return undefined;
}

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  workerStartupAbort.abort();
  app.log.info({ signal }, "shutting down");
  try {
    await app.close();
    const workers = await workerStartup;
    await workers?.close();
    await queueClient?.close();
    await db?.$disconnect();
    queueRedis?.disconnect();
    redis?.disconnect();
    limiterRedis?.disconnect();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "error during shutdown");
    process.exit(1);
  }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ host: env.HOST, port: env.PORT });
if (env.RUN_WORKERS_IN_PROCESS && !shuttingDown) workerStartup = startInProcessWorkers();
