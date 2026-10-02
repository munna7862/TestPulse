import { existsSync } from "node:fs";
import { buildApp } from "./app";
import { loadApiEnv } from "./env";
import { startWorkers, type WorkerHandle } from "./worker";

// Local development convenience: load apps/api/.env if present (never in production).
if (process.env.NODE_ENV !== "production" && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const env = loadApiEnv();
const app = await buildApp({ env });

let workers: WorkerHandle | undefined;
if (env.RUN_WORKERS_IN_PROCESS) {
  workers = await startWorkers(app.log);
}

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "shutting down");
  try {
    await app.close();
    await workers?.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, "error during shutdown");
    process.exit(1);
  }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ host: env.HOST, port: env.PORT });
