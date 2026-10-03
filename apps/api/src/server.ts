import { existsSync } from "node:fs";
import { checkDatabase, createPrismaClient } from "@testpulse/db";
import { buildApp } from "./app";
import { loadApiEnv } from "./env";
import { checkRedis, createRedis } from "./lib/redis";
import { RedisRateLimitStore } from "./modules/auth/rate-limiter";
import { startWorkers, type WorkerHandle } from "./worker";

// Local development convenience: load apps/api/.env if present (never in production).
if (process.env.NODE_ENV !== "production" && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const env = loadApiEnv();
const db = env.DATABASE_URL ? createPrismaClient(env.DATABASE_URL) : undefined;
const redis = env.REDIS_URL ? createRedis(env.REDIS_URL) : undefined;

const app = await buildApp({
  env,
  ...(redis ? { rateLimitStore: new RedisRateLimitStore(redis) } : {}),
  health: {
    ...(db ? { database: () => checkDatabase(db) } : {}),
    ...(redis ? { redis: () => checkRedis(redis) } : {}),
  },
});

let workers: WorkerHandle | undefined;
if (env.RUN_WORKERS_IN_PROCESS) {
  workers = await startWorkers({ log: app.log, redisUrl: env.REDIS_URL });
}

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "shutting down");
  try {
    await app.close();
    await workers?.close();
    await db?.$disconnect();
    redis?.disconnect();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "error during shutdown");
    process.exit(1);
  }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ host: env.HOST, port: env.PORT });
