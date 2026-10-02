import { Queue, type ConnectionOptions } from "bullmq";
import { z } from "zod";

/** Queue names. Later sprints add: "ingest", "domain-events", "notifications", "webhooks", ... */
export const QUEUES = ["system"] as const;
export type QueueName = (typeof QUEUES)[number];

/**
 * Every job name maps to its queue and a Zod schema; job data is validated on enqueue AND on processing
 * (AGENTS.md §2). Tenant-bound jobs must include orgId/projectId (ADR-006 layer 4).
 */
export const JOBS = {
  "system.heartbeat": {
    queue: "system",
    schema: z.object({ scheduledAt: z.iso.datetime().optional() }),
  },
} as const satisfies Record<string, { queue: QueueName; schema: z.ZodType }>;

export type JobName = keyof typeof JOBS;
export type JobData<N extends JobName> = z.infer<(typeof JOBS)[N]["schema"]>;

export const HEARTBEAT_KEY = "tp:worker:heartbeat";
export const HEARTBEAT_SCHEDULER_ID = "system.heartbeat.every-minute";

export interface QueueClient {
  enqueue<N extends JobName>(name: N, data: JobData<N>, opts?: { jobId?: string; delayMs?: number }): Promise<string>;
  queue(name: QueueName): Queue;
  close(): Promise<void>;
}

/** Producer side: used by API handlers (after DB commit) and by workers enqueueing follow-up jobs. */
export function createQueueClient(connection: ConnectionOptions, prefix = "tp"): QueueClient {
  const queues = new Map<QueueName, Queue>(
    QUEUES.map((name) => [
      name,
      new Queue(name, {
        connection,
        prefix,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 1_000 },
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        },
      }),
    ]),
  );

  const get = (name: QueueName): Queue => {
    const queue = queues.get(name);
    if (!queue) throw new Error(`Unknown queue ${name}`);
    return queue;
  };

  return {
    async enqueue(name, data, opts) {
      const definition = JOBS[name];
      const parsed = definition.schema.parse(data);
      const job = await get(definition.queue).add(name, parsed, {
        ...(opts?.jobId ? { jobId: opts.jobId } : {}),
        ...(opts?.delayMs ? { delay: opts.delayMs } : {}),
      });
      return job.id ?? "";
    },
    queue: get,
    async close() {
      await Promise.all([...queues.values()].map((queue) => queue.close()));
    },
  };
}
