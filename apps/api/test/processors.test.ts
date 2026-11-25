import RedisMock from "ioredis-mock";
import { describe, expect, it } from "vitest";
import { processors } from "../src/queues/processors";
import { HEARTBEAT_KEY, JOBS } from "../src/queues/registry";

describe("job processors (unit, ioredis-mock)", () => {
  it("[SC-OPS-001] heartbeat writes a timestamp with a TTL", async () => {
    const redis = new RedisMock();
    const now = new Date("2026-10-02T12:00:00.000Z");
    await processors["system.heartbeat"]({}, { redis, now: () => now });
    expect(await redis.get(HEARTBEAT_KEY)).toBe(now.toISOString());
    expect(await redis.ttl(HEARTBEAT_KEY)).toBeGreaterThan(0);
  });

  it("validates job data with the registered schema", () => {
    expect(() => JOBS["system.heartbeat"].schema.parse({ scheduledAt: "not-a-date" })).toThrow();
    expect(JOBS["system.heartbeat"].schema.parse({})).toEqual({});
    expect(() =>
      JOBS["member.access_changed"].schema.parse({
        orgId: "not-a-uuid",
        userId: "01950000-0000-7000-8000-000000000001",
        reason: "removed",
        previousRole: "MEMBER",
        newRole: null,
      }),
    ).toThrow();
    expect(
      JOBS["member.access_changed"].schema.parse({
        orgId: "01950000-0000-7000-8000-000000000001",
        userId: "01950000-0000-7000-8000-000000000002",
        reason: "role_changed",
        previousRole: "ADMIN",
        newRole: "MEMBER",
      }),
    ).toMatchObject({ reason: "role_changed", previousRole: "ADMIN", newRole: "MEMBER" });
  });

  it("[SC-ORG-015] accepts member.access_changed domain events without throwing", async () => {
    const redis = new RedisMock();
    await expect(
      processors["member.access_changed"](
        {
          orgId: "01950000-0000-7000-8000-000000000001",
          userId: "01950000-0000-7000-8000-000000000002",
          reason: "removed",
          previousRole: "MEMBER",
          newRole: null,
        },
        { redis, now: () => new Date("2026-10-02T12:00:00.000Z") },
      ),
    ).resolves.toBeUndefined();
  });
});
