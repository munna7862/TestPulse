import type { PrismaClient } from "@testpulse/db";
import { afterAll, describe, expect, it } from "vitest";
import { createRedis } from "../src/lib/redis";
import { processors, type ProcessorMap } from "../src/queues/processors";
import {
  createQueueClient,
  HEARTBEAT_KEY,
  HEARTBEAT_SCHEDULER_ID,
  PURGE_SWEEP_INTERVAL_MS,
  PURGE_SWEEP_SCHEDULER_ID,
} from "../src/queues/registry";
import { startWorkers } from "../src/worker";

const redisUrl = process.env.REDIS_URL ?? "";
const basePrefix = `tp-contract-${process.pid}-${Date.now()}`;
const log = { info: () => undefined, warn: () => undefined, error: () => undefined };

describe("BullMQ contract (real Redis)", () => {
  const redis = createRedis(redisUrl);

  afterAll(async () => {
    const keys = await redis.keys(`${basePrefix}*`);
    if (keys.length > 0) await redis.del(...keys);
    await redis.del(HEARTBEAT_KEY);
    redis.disconnect();
  });

  it("[SC-OPS-001] enqueued heartbeat job is processed by the worker", async () => {
    const prefix = `${basePrefix}-hb`;
    await redis.del(HEARTBEAT_KEY);
    const workers = await startWorkers({ log, redisUrl, prefix });
    const client = createQueueClient(createRedis(redisUrl, { forWorker: true }), prefix);
    try {
      await client.enqueue("system.heartbeat", {});
      await expect.poll(() => redis.get(HEARTBEAT_KEY), { timeout: 10_000 }).not.toBeNull();
    } finally {
      await client.close();
      await workers.close();
    }
  });

  it("[SC-OPS-004] re-registering schedulers on restart does not duplicate them and preserves cadence", async () => {
    const prefix = `${basePrefix}-sched`;
    for (let i = 0; i < 3; i++) {
      const workers = await startWorkers({ log, redisUrl, prefix });
      await workers.close();
    }
    const client = createQueueClient(createRedis(redisUrl), prefix);
    try {
      const schedulers = await client.queue("system").getJobSchedulers();
      expect(
        schedulers.filter((s) => s.key === HEARTBEAT_SCHEDULER_ID || s.id === HEARTBEAT_SCHEDULER_ID),
      ).toHaveLength(1);
      const purgeSchedulers = schedulers.filter(
        (s) => s.key === PURGE_SWEEP_SCHEDULER_ID || s.id === PURGE_SWEEP_SCHEDULER_ID,
      );
      expect(purgeSchedulers).toHaveLength(1);
      expect(purgeSchedulers[0]?.every).toBe(PURGE_SWEEP_INTERVAL_MS);
      expect(purgeSchedulers[0]?.name).toBe("system.purge-sweep");
    } finally {
      await client.close();
    }
  });

  it("[SC-ORG-004] enqueued tenant purge and sweep jobs dispatch through BullMQ with validated payloads, db forwarding and jobId dedup", async () => {
    const prefix = `${basePrefix}-purge`;
    const dispatched: Array<{ name: string; data: unknown; hasDb: boolean }> = [];
    const sentinelDb = {} as PrismaClient;
    const customProcessors: ProcessorMap = {
      ...processors,
      "tenant.purge-org": async (data, deps) => {
        dispatched.push({ name: "tenant.purge-org", data, hasDb: deps.db === sentinelDb });
      },
      "tenant.purge-project": async (data, deps) => {
        dispatched.push({ name: "tenant.purge-project", data, hasDb: deps.db === sentinelDb });
      },
      "system.purge-sweep": async (data, deps) => {
        dispatched.push({ name: "system.purge-sweep", data, hasDb: deps.db === sentinelDb });
      },
    };
    const workers = await startWorkers({ log, redisUrl, prefix, db: sentinelDb, processors: customProcessors });
    const client = createQueueClient(createRedis(redisUrl, { forWorker: true }), prefix);
    const orgId = "01950000-0000-7000-8000-000000000010";
    const projectId = "01950000-0000-7000-8000-000000000020";
    try {
      await expect(client.enqueue("tenant.purge-org", { orgId: "not-a-uuid" })).rejects.toThrow();

      // Duplicate jobId for the same orgId is deduplicated by BullMQ while retained.
      await client.enqueue("tenant.purge-org", { orgId }, { jobId: `purge-org_${orgId}` });
      await client.enqueue("tenant.purge-org", { orgId }, { jobId: `purge-org_${orgId}` });
      await client.enqueue("tenant.purge-project", { orgId, projectId }, { jobId: `purge-project_${projectId}` });
      await client.enqueue("system.purge-sweep", { batchSize: 25 });

      await expect
        .poll(
          () => {
            const names = new Set(dispatched.map((d) => d.name));
            return (
              names.has("tenant.purge-org") && names.has("tenant.purge-project") && names.has("system.purge-sweep")
            );
          },
          { timeout: 10_000 },
        )
        .toBe(true);

      expect(dispatched.filter((d) => d.name === "tenant.purge-org")).toEqual([
        { name: "tenant.purge-org", data: { orgId }, hasDb: true },
      ]);
      expect(dispatched).toEqual(
        expect.arrayContaining([
          { name: "tenant.purge-project", data: { orgId, projectId }, hasDb: true },
          { name: "system.purge-sweep", data: { batchSize: 25 }, hasDb: true },
        ]),
      );
    } finally {
      await client.close();
      await workers.close();
    }
  });
});
