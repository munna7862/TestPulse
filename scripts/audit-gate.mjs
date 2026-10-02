#!/usr/bin/env node
// Dependency audit gate (AGENTS.md quality gates, security skill §2).
//
// Fails when `npm audit` reports any HIGH or CRITICAL advisory, unless that exact advisory (GHSA ID)
// is listed in security/audit-exceptions.json with a reason, the affected package, and an expiry
// date. Expired exceptions also fail, so accepted risk cannot rot silently.
//
// Usage: node scripts/audit-gate.mjs            (exit 0 = pass, 1 = fail, 2 = could not run audit)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOCKING = new Set(["high", "critical"]);

function runAudit() {
  try {
    return execSync("npm audit --json", { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (error) {
    // npm audit exits non-zero when vulnerabilities exist; the JSON report is still on stdout.
    if (error && typeof error === "object" && "stdout" in error && error.stdout) return String(error.stdout);
    console.error("audit-gate: could not run npm audit", error);
    process.exit(2);
  }
}

const report = JSON.parse(runAudit());
const exceptions = JSON.parse(readFileSync(path.join(root, "security", "audit-exceptions.json"), "utf8")).exceptions;
const today = new Date().toISOString().slice(0, 10);

const findings = [];
for (const [pkg, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via !== "object" || !BLOCKING.has(via.severity)) continue;
    const id = String(via.url ?? "")
      .split("/")
      .pop();
    findings.push({ pkg, id, severity: via.severity, title: via.title });
  }
}

let failed = false;
for (const finding of findings) {
  const exception = exceptions.find((e) => e.advisory === finding.id && e.package === finding.pkg);
  if (!exception) {
    failed = true;
    console.error(`✖ ${finding.severity.toUpperCase()} ${finding.pkg} ${finding.id}: ${finding.title} (no exception)`);
  } else if (exception.expires < today) {
    failed = true;
    console.error(
      `✖ ${finding.severity.toUpperCase()} ${finding.pkg} ${finding.id}: exception EXPIRED on ${exception.expires}`,
    );
  } else {
    console.info(
      `⚠ ${finding.severity} ${finding.pkg} ${finding.id}: accepted until ${exception.expires} — ${exception.reason}`,
    );
  }
}

const stale = exceptions.filter((e) => !findings.some((f) => f.id === e.advisory && f.pkg === e.package));
for (const e of stale) {
  console.info(
    `ℹ exception for ${e.package} ${e.advisory} no longer needed — remove it from security/audit-exceptions.json`,
  );
}

if (failed) {
  console.error("audit-gate: FAILED (fix the dependency or add a time-boxed exception with justification)");
  process.exit(1);
}
console.info(`audit-gate: passed (${findings.length} high/critical finding(s), all covered by unexpired exceptions)`);
