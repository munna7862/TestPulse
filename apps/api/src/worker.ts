import { Worker } from "bullmq";
import type { FastifyBaseLogger } from "fastify";
import { createRedis, type Redis } from "./lib/redis";
import { processors as defaultProcessors, type ProcessorDeps, type ProcessorMap } from "./queues/processors";
import { createQueueClient, HEARTBEAT_SCHEDULER_ID, JOBS, type JobName, QUEUES } from "./queues/registry";

export interface WorkerHandle {
  close: () => Promise<void>;
}

export interface StartWorkersOptions {
  log: Pick<FastifyBaseLogger, "info" | "warn" | "error">;
  redisUrl?: string | undefined;
  processors?: ProcessorMap;
  /** Key prefix for BullMQ (tests use a unique prefix). */
  prefix?: string;
  now?: () => Date;
}

function isJobName(name: string): name is JobName {
  return Object.hasOwn(JOBS, name);
}

/**
 * Starts all BullMQ workers. In the free deployment profile this runs inside the API process
 * (`RUN_WORKERS_IN_PROCESS=true`); in the paid profile `worker.ts` runs as its own service.
 * Repeatable jobs are (re)registered idempotently on every start, because free-tier Redis is not
 * persistent (master plan §4.4 rule 1, SC-OPS-004).
 */
export async function startWorkers({
  log,
  redisUrl,
  processors = defaultProcessors,
  prefix = "tp",
  now = () => new Date(),
}: StartWorkersOptions): Promise<WorkerHandle> {
  if (!redisUrl) {
    log.warn("REDIS_URL is not set: background workers are disabled");
    return { close: async () => undefined };
  }

  const connection: Redis = createRedis(redisUrl, { forWorker: true });
  const deps: ProcessorDeps = { redis: connection, now };
  const client = createQueueClient(connection, prefix);

  const workers = QUEUES.map(
    (queueName) =>
      new Worker(
        queueName,
        async (job) => {
          if (!isJobName(job.name)) throw new Error(`Unknown job ${job.name}`);
          const name = job.name;
          const data: unknown = JOBS[name].schema.parse(job.data);
          // Each processor validates its own data type; the cast is safe after schema.parse above.
          await (processors[name] as (d: unknown, deps: ProcessorDeps) => Promise<void>)(data, deps);
        },
        { connection, prefix, concurrency: 5 },
      ),
  );

  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      log.error({ err: error, job: job?.name, jobId: job?.id }, "job failed");
    });
  }

  await client
    .queue("system")
    .upsertJobScheduler(HEARTBEAT_SCHEDULER_ID, { every: 60_000 }, { name: "system.heartbeat", data: {} });

  log.info({ queues: QUEUES }, "workers started");

  return {
    close: async () => {
      await Promise.all(workers.map((worker) => worker.close()));
      await client.close();
      connection.disconnect();
      log.info("workers stopped");
    },
  };
}
