import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["../../packages/db/test/global-setup.ts"],
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["**/*.contract.test.ts", "**/node_modules/**"],
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
