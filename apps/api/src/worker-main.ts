/**
 * Standalone worker process entry (paid deployment profile: `npm run start:worker`).
 * Kept separate from worker.ts so bundling the library into server.js never starts a second set of workers.
 */
import { pino } from "pino";
import { LOG_REDACT_PATHS } from "./log-redaction";
import { startWorkers } from "./worker";

const log = pino({ level: process.env.LOG_LEVEL ?? "info", redact: { paths: LOG_REDACT_PATHS, censor: "[REDACTED]" } });
const handle = await startWorkers({ log, redisUrl: process.env.REDIS_URL });

async function shutdown(): Promise<void> {
  await handle.close();
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
