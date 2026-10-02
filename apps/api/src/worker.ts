import { pathToFileURL } from "node:url";
import type { FastifyBaseLogger } from "fastify";

export interface WorkerHandle {
  close: () => Promise<void>;
}

/**
 * Starts all BullMQ workers. In the free deployment profile this runs inside the API process
 * (`RUN_WORKERS_IN_PROCESS=true`); in the paid profile `worker.ts` runs as its own service.
 * Queues and processors are registered here from P02-S03 onward.
 */
export async function startWorkers(log: Pick<FastifyBaseLogger, "info">): Promise<WorkerHandle> {
  log.info("workers started (no queues registered yet)");
  return {
    close: async () => {
      log.info("workers stopped");
    },
  };
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const log = { info: (message: string) => console.info(JSON.stringify({ level: "info", msg: message })) };
  const handle = await startWorkers(log);
  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());
}
