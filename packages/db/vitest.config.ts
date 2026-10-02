import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 180_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "src/generated/**"],
      reporter: ["text-summary", "lcov"],
      // Floors measured on 2026-10-02. Raise after each slice; never lower without a written reason.
      thresholds: { lines: 84, statements: 80, functions: 76, branches: 80 },
    },
  },
});
