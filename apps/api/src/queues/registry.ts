import { OrgIdSchema, ProjectIdSchema } from "@testpulse/shared";
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
  "tenant.purge-org": {
    queue: "system",
    schema: z.object({ orgId: OrgIdSchema }).strict(),
  },
  "tenant.purge-project": {
    queue: "system",
    schema: z.object({ orgId: OrgIdSchema, projectId: ProjectIdSchema }).strict(),
  },
  "system.purge-sweep": {
    queue: "system",
    schema: z.object({ batchSize: z.number().int().min(1).max(200).default(50) }).strict(),
  },
} as const satisfies Record<string, { queue: QueueName; schema: z.ZodType }>;

export type JobName = keyof typeof JOBS;
export type JobData<N extends JobName> = z.infer<(typeof JOBS)[N]["schema"]>;

export const HEARTBEAT_KEY = "tp:worker:heartbeat";
export const HEARTBEAT_SCHEDULER_ID = "system.heartbeat.every-minute";
export const PURGE_SWEEP_SCHEDULER_ID = "system.purge-sweep.every-15m";
export const PURGE_SWEEP_INTERVAL_MS = 15 * 60_000;

export interface QueueClient {
  enqueue<N extends JobName>(name: N, data: JobData<N>, opts?: { jobId?: string; delayMs?: number }): Promise<string>;
  queue(name: QueueName): Queue;
  close(): Promise<void>;
}

export interface CreateQueueClientOptions {
  /** Upper bound for `enqueue()` so a stalled or reconnecting Redis never stalls an HTTP request. */
  enqueueTimeoutMs?: number;
  /** Optional listener for BullMQ Queue error events (prevents unhandled 'error' crashes). */
  onError?: (error: unknown) => void;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  // Attach a fallback catch so a late rejection after timeout never triggers unhandledRejection.
  promise.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/** Producer side: used by API handlers (after DB commit) and by workers enqueueing follow-up jobs. */
export function createQueueClient(
  connection: ConnectionOptions,
  prefix = "tp",
  { enqueueTimeoutMs = 1_000, onError }: CreateQueueClientOptions = {},
): QueueClient {
  const queues = new Map<QueueName, Queue>(
    QUEUES.map((name) => {
      const q = new Queue(name, {
        connection,
        prefix,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 1_000 },
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        },
      });
      q.on("error", (error) => onError?.(error));
      return [name, q];
    }),
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
      const job = await withTimeout(
        get(definition.queue).add(name, parsed, {
          ...(opts?.jobId ? { jobId: opts.jobId } : {}),
          ...(opts?.delayMs ? { delay: opts.delayMs } : {}),
        }),
        enqueueTimeoutMs,
        `Queue enqueue (${name})`,
      );
      return job.id ?? "";
    },
    queue: get,
    async close() {
      await Promise.all([...queues.values()].map((queue) => queue.close()));
    },
  };
}
