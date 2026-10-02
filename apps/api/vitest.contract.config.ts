import { defineConfig } from "vitest/config";

/**
 * Contract tests against REAL Redis (BullMQ, socket.io adapter). Required in CI; optional locally.
 * docs/testing/testing-strategy.md §2.2: never silently skipped in CI.
 */
const hasRedis = Boolean(process.env.REDIS_URL);
if (!hasRedis && process.env.CI) {
  throw new Error("REDIS_URL must be set in CI for the contract suite (test:contract).");
}
if (!hasRedis) {
  console.warn("[test:contract] REDIS_URL is not set: contract suite not run locally (it runs in CI).");
}

export default defineConfig({
  test: {
    include: hasRedis ? ["test/**/*.contract.test.ts"] : [],
    passWithNoTests: !hasRedis,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
