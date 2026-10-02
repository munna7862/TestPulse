#!/usr/bin/env node
/**
 * PR size budget (docs/process/ai-delivery-playbook.html §4, approach 3).
 * Fails when a PR changes more product lines than one person can review well.
 * Lockfile, generated code, migrations, tests and docs do not count.
 * Override with the `size/exception` label (CI sets PR_SIZE_OVERRIDE=true) and say why in the PR.
 */
import { execFileSync } from "node:child_process";

const base = process.env.BASE_REF ?? "origin/main";
const limit = Number(process.env.PR_SIZE_LIMIT ?? 800);
const ignored = [
  /(^|\/)package-lock\.json$/,
  /\/src\/generated\//,
  /\/prisma\/migrations\//,
  /^(docs|planning|\.agents|\.claude)\//,
  /\.md$/,
  /\.(test|spec)\.tsx?$/,
  /\/(test|e2e)\//,
];

const numstat = execFileSync("git", ["diff", "--numstat", `${base}...HEAD`], { encoding: "utf8" });
let changed = 0;
for (const line of numstat.trim().split("\n")) {
  const [added, deleted, file] = line.split("\t");
  if (!file || added === "-" || ignored.some((re) => re.test(file))) continue;
  changed += Number(added) + Number(deleted);
}

console.info(`Product lines changed vs ${base}: ${changed} (limit ${limit})`);
if (changed > limit && process.env.PR_SIZE_OVERRIDE !== "true") {
  console.error("PR is too large to review well. Split it, or add the size/exception label and explain why in the PR.");
  process.exit(1);
}
