#!/usr/bin/env node
/**
 * Traceability Gate (master plan D-15, P02-S05).
 * Validates that every scenario marked automated in docs/testing/scenario-catalog.md
 * has an automated test whose title contains its [SC-*] ID.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultRootDir = resolve(__dirname, "..");

export function findTestFiles(dir, fileList = []) {
  if (!existsSync(dir)) return fileList;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist" || entry === ".turbo" || entry === ".git") {
      continue;
    }
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findTestFiles(fullPath, fileList);
    } else if (
      entry.endsWith(".test.ts") ||
      entry.endsWith(".test.tsx") ||
      entry.endsWith(".spec.ts") ||
      entry.endsWith(".spec.tsx")
    ) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function parseScenarioCatalog(catalogContent) {
  const rowRegex = /\|\s*(SC-[A-Z0-9]+-\d{3})\s*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|\s*([^|\r\n]+)\s*\|/g;
  const scenarios = [];
  let match;

  while ((match = rowRegex.exec(catalogContent)) !== null) {
    const id = match[1]?.trim();
    const automatedBy = match[6]?.trim();
    if (!id || !automatedBy) continue;

    const isAutomated = automatedBy !== "—" && automatedBy !== "-" && automatedBy.length > 0;
    scenarios.push({ id, automatedBy, isAutomated });
  }

  return scenarios;
}

export function verifyTraceability(rootDir = defaultRootDir, customCatalogContent = null) {
  const catalogPath = resolve(rootDir, "docs/testing/scenario-catalog.md");
  let catalogContent = customCatalogContent;

  if (catalogContent === null) {
    if (!existsSync(catalogPath)) {
      throw new Error(`Traceability error: scenario catalog not found at ${catalogPath}`);
    }
    catalogContent = readFileSync(catalogPath, "utf-8");
  }

  const scenarios = parseScenarioCatalog(catalogContent);
  if (scenarios.length === 0) {
    throw new Error("Traceability error: no SC-* scenarios found in scenario catalog.");
  }

  const testFiles = findTestFiles(rootDir);
  const testFileContents = new Map();

  for (const file of testFiles) {
    testFileContents.set(file, readFileSync(file, "utf-8"));
  }

  const automatedScenarios = scenarios.filter((s) => s.isAutomated);
  const failures = [];
  const verified = [];

  for (const scenario of automatedScenarios) {
    const targetRelPath = scenario.automatedBy.replace(/[\\/]/g, "/");
    const targetAbsPath = resolve(rootDir, targetRelPath);

    let found = false;

    // 1. Check declared file
    if (testFileContents.has(targetAbsPath)) {
      const content = testFileContents.get(targetAbsPath);
      if (content.includes(`[${scenario.id}]`)) {
        found = true;
      }
    } else if (existsSync(targetAbsPath)) {
      const content = readFileSync(targetAbsPath, "utf-8");
      if (content.includes(`[${scenario.id}]`)) {
        found = true;
      }
    }

    // 2. Fallback search across all test files
    if (!found) {
      for (const [_, content] of testFileContents.entries()) {
        if (content.includes(`[${scenario.id}]`)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      verified.push(scenario.id);
    } else {
      failures.push({
        id: scenario.id,
        declaredPath: scenario.automatedBy,
      });
    }
  }

  return { scenarios, automatedScenarios, verified, failures };
}

// Execute CLI when directly run
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    const targetDir = process.argv[2] ? resolve(process.argv[2]) : defaultRootDir;
    const { scenarios, automatedScenarios, verified, failures } = verifyTraceability(targetDir);

    console.info("--------------------------------------------------");
    console.info("🔍 TestPulse Traceability Verification Gate");
    console.info("--------------------------------------------------");
    console.info(`Total Scenarios Registered: ${scenarios.length}`);
    console.info(`Marked Automated:           ${automatedScenarios.length}`);
    console.info(`Verified Against Tests:     ${verified.length}`);

    if (failures.length > 0) {
      console.error(
        `\n❌ Traceability Check FAILED: ${failures.length} scenario(s) marked automated with no matching test:`,
      );
      for (const failure of failures) {
        console.error(
          `  - ${failure.id}: declared in '${failure.declaredPath}' but not found with [${failure.id}] in title`,
        );
      }
      process.exit(1);
    }

    console.info("\n✅ Traceability Check PASSED: 100% of automated scenarios verified against tests.");
    console.info("--------------------------------------------------");
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
