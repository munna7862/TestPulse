import type { PrismaClient } from "@testpulse/db";
import type { Redis } from "ioredis";
import { purgeSoftDeletedOrg, purgeSoftDeletedProject, sweepSoftDeletedTenants } from "./purge";
import { HEARTBEAT_KEY, type JobData, type JobName } from "./registry";

/** Minimal Redis surface processors may use (keeps them testable with ioredis-mock). */
export type ProcessorRedis = Pick<Redis, "get" | "set" | "del">;

export interface ProcessorDeps {
  redis: ProcessorRedis;
  now: () => Date;
  db?: PrismaClient;
}

export type Processor<N extends JobName> = (data: JobData<N>, deps: ProcessorDeps) => Promise<void>;
export type ProcessorMap = { [N in JobName]: Processor<N> };

function requireDb(deps: ProcessorDeps): PrismaClient {
  if (!deps.db) throw new Error("Database client is required for purge processors.");
  return deps.db;
}

/**
 * Processors are plain functions with injected dependencies so they are unit-testable without BullMQ
 * (backend skill §4). Queue wiring is covered by the contract suite.
 */
export const processors: ProcessorMap = {
  "system.heartbeat": async (_data, { redis, now }) => {
    await redis.set(HEARTBEAT_KEY, now().toISOString(), "EX", 300);
  },
  "tenant.purge-org": async (data, deps) => {
    await purgeSoftDeletedOrg(requireDb(deps), data.orgId);
  },
  "tenant.purge-project": async (data, deps) => {
    await purgeSoftDeletedProject(requireDb(deps), data.orgId, data.projectId);
  },
  "system.purge-sweep": async (data, deps) => {
    await sweepSoftDeletedTenants(requireDb(deps), data.batchSize);
  },
  /** Socket room eviction on membership removal/downgrade attaches in P05-S01. */
  "member.access_changed": async () => undefined,
};
