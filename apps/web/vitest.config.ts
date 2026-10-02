import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.ts", "**/*.test.tsx"],
      reporter: ["text-summary", "lcov"],
      // Floors measured on 2026-10-02. Raise after each slice; never lower without a written reason.
      thresholds: { lines: 8, statements: 8, functions: 7, branches: 15 },
    },
  },
});
