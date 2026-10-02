import { afterAll, describe, expect, it } from "vitest";
import { createRedis } from "../src/lib/redis";
import { createQueueClient, HEARTBEAT_KEY, HEARTBEAT_SCHEDULER_ID } from "../src/queues/registry";
import { startWorkers } from "../src/worker";

const redisUrl = process.env.REDIS_URL ?? "";
const prefix = `tp-contract-${process.pid}-${Date.now()}`;
const log = { info: () => undefined, warn: () => undefined, error: () => undefined };

describe("BullMQ contract (real Redis)", () => {
  const redis = createRedis(redisUrl);

  afterAll(async () => {
    const keys = await redis.keys(`${prefix}:*`);
    if (keys.length > 0) await redis.del(...keys);
    await redis.del(HEARTBEAT_KEY);
    redis.disconnect();
  });

  it("[SC-OPS-001] enqueued heartbeat job is processed by the worker", async () => {
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

  it("[SC-OPS-004] re-registering schedulers on restart does not duplicate them", async () => {
    for (let i = 0; i < 3; i++) {
      const workers = await startWorkers({ log, redisUrl, prefix });
      await workers.close();
    }
    const client = createQueueClient(createRedis(redisUrl), prefix);
    try {
      const schedulers = await client.queue("system").getJobSchedulers();
      expect(schedulers.filter((s) => s.key === HEARTBEAT_SCHEDULER_ID || s.id === HEARTBEAT_SCHEDULER_ID)).toHaveLength(1);
    } finally {
      await client.close();
    }
  });
});
