/**
 * Standalone worker process entry (paid deployment profile: `npm run start:worker`).
 * Kept separate from worker.ts so bundling the library into server.js never starts a second set of workers.
 */
import { existsSync } from "node:fs";
import { createPrismaClient } from "@testpulse/db";
import { pino } from "pino";
import { loadApiEnv } from "./env";
import { LOG_REDACT_PATHS } from "./log-redaction";
import { startWorkers } from "./worker";

if (process.env.NODE_ENV !== "production" && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const env = loadApiEnv();
const db = env.DATABASE_URL ? createPrismaClient(env.DATABASE_URL) : undefined;
const log = pino({ level: env.LOG_LEVEL, redact: { paths: LOG_REDACT_PATHS, censor: "[REDACTED]" } });
const handle = await startWorkers({ log, redisUrl: env.REDIS_URL, ...(db ? { db } : {}) });

async function shutdown(): Promise<void> {
  await handle.close();
  await db?.$disconnect();
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
