import { Redis } from "ioredis";

export type { Redis };

/**
 * Creates an ioredis 5 client (ADR-004). Server-only — never import from @testpulse/shared.
 * BullMQ workers require `maxRetriesPerRequest: null` (blocking commands).
 */
export function createRedis(url: string, { forWorker = false }: { forWorker?: boolean } = {}): Redis {
  return new Redis(url, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: forWorker ? null : 3,
  });
}

/** Connectivity probe for `/health`. Never throws. */
export async function checkRedis(redis: Redis, timeoutMs = 2_000): Promise<"up" | "down"> {
  try {
    const reply = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return reply === "PONG" ? "up" : "down";
  } catch {
    return "down";
  }
}
