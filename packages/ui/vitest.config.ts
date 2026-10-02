import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.ts", "**/*.test.tsx"],
      reporter: ["text-summary", "lcov"],
      // Floors measured on 2026-10-02. Raise after each slice; never lower without a written reason.
      thresholds: { lines: 69, statements: 68, functions: 25, branches: 39 },
    },
  },
});
