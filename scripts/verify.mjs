#!/usr/bin/env node
/**
 * Runs the CI "Verify Quality Gates" job locally, in the same order, and stops at the first failure.
 * Contract tests run only when REDIS_URL is set; gitleaks runs in CI only.
 */
import { spawnSync } from "node:child_process";

const steps = [
  ["lint", "npm run lint"],
  ["typecheck", "npm run typecheck"],
  ["format", "npm run format:check"],
  ["traceability", "npm run check:traceability"],
  ["test + coverage", "npm run test"],
  ...(process.env.REDIS_URL ? [["contract", "npm run test:contract"]] : []),
  ["build", "npm run build"],
  ["audit", "npm run audit"],
];

for (const [name, command] of steps) {
  console.info(`\n▶ ${name}: ${command}`);
  const result = spawnSync(command, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\n✖ verify failed at "${name}". CI would fail here too.`);
    process.exit(result.status ?? 1);
  }
}
if (!process.env.REDIS_URL) console.warn("\n⚠ test:contract skipped (REDIS_URL not set). CI runs it.");
console.info("\n✔ verify passed (gitleaks runs in CI).");
