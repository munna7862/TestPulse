import type { Redis } from "ioredis";
import { HEARTBEAT_KEY, type JobData, type JobName } from "./registry";

/** Minimal Redis surface processors may use (keeps them testable with ioredis-mock). */
export type ProcessorRedis = Pick<Redis, "get" | "set" | "del">;

export interface ProcessorDeps {
  redis: ProcessorRedis;
  now: () => Date;
}

export type Processor<N extends JobName> = (data: JobData<N>, deps: ProcessorDeps) => Promise<void>;
export type ProcessorMap = { [N in JobName]: Processor<N> };

/**
 * Processors are plain functions with injected dependencies so they are unit-testable without BullMQ
 * (backend skill §4). Queue wiring is covered by the contract suite.
 */
export const processors: ProcessorMap = {
  "system.heartbeat": async (_data, { redis, now }) => {
    await redis.set(HEARTBEAT_KEY, now().toISOString(), "EX", 300);
  },
};
