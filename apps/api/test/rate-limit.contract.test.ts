import { afterAll, describe, expect, it } from "vitest";
import { createRedis } from "../src/lib/redis";
import { RedisRateLimitStore } from "../src/modules/auth/rate-limiter";

const redisUrl = process.env.REDIS_URL ?? "";
const prefix = `tp-contract-rl-${process.pid}-${Date.now()}`;

describe("Auth rate-limit store contract (real Redis)", () => {
  const redisA = createRedis(redisUrl);
  const redisB = createRedis(redisUrl);

  afterAll(async () => {
    const keys = await redisA.keys(`${prefix}:*`);
    if (keys.length > 0) await redisA.del(...keys);
    redisA.disconnect();
    redisB.disconnect();
  });

  it("[SC-AUTH-017] counters are shared across API instances and always carry an expiry", async () => {
    const instanceA = new RedisRateLimitStore(redisA, prefix);
    const instanceB = new RedisRateLimitStore(redisB, prefix);

    const results = await Promise.all([
      instanceA.hit("login:ip:203.0.113.1", 60_000),
      instanceB.hit("login:ip:203.0.113.1", 60_000),
      instanceA.hit("login:ip:203.0.113.1", 60_000),
      instanceB.hit("login:ip:203.0.113.1", 60_000),
    ]);
    expect(results.map((r) => r.count).sort()).toEqual([1, 2, 3, 4]);
    for (const result of results) {
      expect(result.resetMs).toBeGreaterThan(0);
      expect(result.resetMs).toBeLessThanOrEqual(60_000);
    }
    expect(await redisA.pttl(`${prefix}:login:ip:203.0.113.1`)).toBeGreaterThan(0);
  });

  it("[SC-AUTH-017] a new window starts after the old one expires", async () => {
    const store = new RedisRateLimitStore(redisA, prefix);
    await store.hit("recovery:email:abc", 150);
    await store.hit("recovery:email:abc", 150);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect((await store.hit("recovery:email:abc", 150)).count).toBe(1);
  });
});
