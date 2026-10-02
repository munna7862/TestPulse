import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test.tsx"],
      reporter: ["text-summary", "lcov"],
      // Floors measured on 2026-10-02. Raise after each slice; never lower without a written reason.
      thresholds: { lines: 94, statements: 93, functions: 90, branches: 91 },
    },
  },
});
