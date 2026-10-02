import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import YAML from "yaml";
import { loadApiEnv } from "../src/env";
import { startWorkers } from "../src/worker";

const rootDir = resolve(__dirname, "../../..");
const traceabilityScriptPath = resolve(rootDir, "scripts/check-traceability.mjs");

describe("CI/CD Pipeline & Deployment Specifications [FR-OPS-02, FR-OPS-04]", () => {
  describe("Worker Deployment Profiles [SC-OPS-003]", () => {
    it("[SC-OPS-003] parses RUN_WORKERS_IN_PROCESS configuration correctly", () => {
      const envInProcess = loadApiEnv({
        NODE_ENV: "test",
        RUN_WORKERS_IN_PROCESS: "true",
      });
      expect(envInProcess.RUN_WORKERS_IN_PROCESS).toBe(true);

      const envStandalone = loadApiEnv({
        NODE_ENV: "test",
        RUN_WORKERS_IN_PROCESS: "false",
      });
      expect(envStandalone.RUN_WORKERS_IN_PROCESS).toBe(false);
    });

    it("[SC-OPS-003] startWorkers gracefully degrades when REDIS_URL is not set", async () => {
      const logs: string[] = [];
      const mockLog = {
        info: () => undefined,
        warn: (msg: string) => {
          logs.push(msg);
        },
        error: () => undefined,
      };

      const handle = await startWorkers({
        log: mockLog,
        redisUrl: undefined,
      });

      expect(logs).toContain("REDIS_URL is not set: background workers are disabled");
      await expect(handle.close()).resolves.toBeUndefined();
    });
  });

  describe("Traceability Verification Gate [SC-OPS-005]", () => {
    it("[SC-OPS-005] validates that every automated scenario has a matching test in the repository", () => {
      const output = execFileSync("node", [traceabilityScriptPath], {
        cwd: rootDir,
        encoding: "utf-8",
      });

      expect(output).toContain("TestPulse Traceability Verification Gate");
      expect(output).toContain("Traceability Check PASSED");
      expect(output).toContain("100% of automated scenarios verified against tests");
    });

    it("[SC-OPS-005] fails when a scenario is marked automated without a corresponding test title", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "tp-trace-"));
      try {
        const dummyCatalogDir = join(tempDir, "docs/testing");
        mkdirSync(dummyCatalogDir, { recursive: true });
        const dummyCatalog = `
| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-DUMMY-999 | Given something | Then it fails | U | FR-OPS-04 | nonexistent/path/to/test.ts |
`;
        writeFileSync(join(dummyCatalogDir, "scenario-catalog.md"), dummyCatalog, "utf-8");

        const result = spawnSync("node", [traceabilityScriptPath, tempDir], {
          cwd: rootDir,
          encoding: "utf-8",
        });

        expect(result.status).toBe(1);
        expect(result.stderr).toContain(
          "Traceability Check FAILED: 1 scenario(s) marked automated with no matching test",
        );
        expect(result.stderr).toContain("SC-DUMMY-999");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("[SC-OPS-005] correctly parses markdown scenario table regex format", () => {
      const sample = `
| SC-TEST-001 | Given X | Then Y | U | FR-01 | apps/api/test/sample.test.ts |
| SC-TEST-002 | Given A | Then B | I | FR-02 | — |
`;
      const rowRegex = /\|\s*(SC-[A-Z0-9]+-\d{3})\s*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|\s*([^|\r\n]+)\s*\|/g;
      const matches: Array<{ id: string; automatedBy: string }> = [];
      let m: RegExpExecArray | null;
      while ((m = rowRegex.exec(sample)) !== null) {
        const id = m[1]?.trim() ?? "";
        const automatedBy = m[6]?.trim() ?? "";
        matches.push({ id, automatedBy });
      }

      expect(matches).toEqual([
        { id: "SC-TEST-001", automatedBy: "apps/api/test/sample.test.ts" },
        { id: "SC-TEST-002", automatedBy: "—" },
      ]);
    });
  });

  describe("GitHub Actions CI Pipeline [SC-OPS-007]", () => {
    const ciWorkflowPath = resolve(rootDir, ".github/workflows/ci.yml");

    it("[SC-OPS-007] defines valid CI workflow with concurrency and service containers", () => {
      expect(existsSync(ciWorkflowPath)).toBe(true);

      const content = readFileSync(ciWorkflowPath, "utf-8");
      const workflow = YAML.parse(content) as Record<string, unknown>;

      // Triggers
      expect(workflow["on"]).toBeDefined();
      const triggers = workflow["on"] as Record<string, unknown>;
      expect(triggers["pull_request"]).toBeDefined();
      expect(triggers["push"]).toBeDefined();

      // Concurrency
      const concurrency = workflow["concurrency"] as Record<string, unknown>;
      expect(concurrency["cancel-in-progress"]).toBe(true);

      // Jobs
      const jobs = workflow["jobs"] as Record<string, Record<string, unknown>>;
      expect(jobs["verify"]).toBeDefined();
      expect(jobs["e2e"]).toBeDefined();

      // Verify job service containers
      const verifyServices = jobs["verify"]?.["services"] as Record<string, Record<string, unknown>>;
      expect(verifyServices["postgres"]).toBeDefined();
      expect(verifyServices["postgres"]?.["image"]).toContain("postgres:16");
      expect(verifyServices["redis"]).toBeDefined();
      expect(verifyServices["redis"]?.["image"]).toContain("redis:7");

      // Verify job steps
      const steps = (jobs["verify"]?.["steps"] as Array<{ name?: string; run?: string }>) ?? [];
      const runCommands = steps.map((s) => s.run ?? "").join("\n");

      expect(runCommands).toContain("npm run lint");
      expect(runCommands).toContain("npm run typecheck");
      expect(runCommands).toContain("npm run format:check");
      expect(runCommands).toContain("npm run check:traceability");
      expect(runCommands).toContain("npm run test");
      expect(runCommands).toContain("npm run test:contract");
      expect(runCommands).toContain("npm run build");

      // Secret scanning
      const usesList = steps.map((s) => (s as { uses?: string }).uses ?? "").join(" ");
      expect(usesList).toContain("gitleaks");

      // E2E job
      const e2eSteps = (jobs["e2e"]?.["steps"] as Array<{ name?: string; run?: string }>) ?? [];
      const e2eRunCommands = e2eSteps.map((s) => s.run ?? "").join("\n");
      expect(e2eRunCommands).toContain("npm run test:e2e");
    });
  });

  describe("Staging Deployment & Keep-Alive Automation [SC-OPS-008]", () => {
    it("[SC-OPS-008] defines valid Render blueprint and staging deployment workflow", () => {
      // 1. Render blueprint
      const renderYamlPath = resolve(rootDir, "render.yaml");
      expect(existsSync(renderYamlPath)).toBe(true);

      const renderContent = readFileSync(renderYamlPath, "utf-8");
      const renderConfig = YAML.parse(renderContent) as {
        services: Array<{
          name: string;
          type: string;
          env: string;
          plan: string;
          healthCheckPath: string;
          envVars?: Array<{ key: string; value?: string }>;
        }>;
      };

      const apiService = renderConfig.services.find((s) => s.name === "testpulse-api-staging");
      expect(apiService).toBeDefined();
      expect(apiService?.type).toBe("web");
      expect(apiService?.plan).toBe("free");
      expect(apiService?.healthCheckPath).toBe("/health");

      const inProcessVar = apiService?.envVars?.find((e) => e.key === "RUN_WORKERS_IN_PROCESS");
      expect(inProcessVar?.value).toBe("true");

      // 2. Deploy staging workflow
      const deployPath = resolve(rootDir, ".github/workflows/deploy-staging.yml");
      expect(existsSync(deployPath)).toBe(true);

      const deployContent = readFileSync(deployPath, "utf-8");
      const deployWorkflow = YAML.parse(deployContent) as Record<string, unknown>;

      const deployJobs = deployWorkflow["jobs"] as Record<string, Record<string, unknown>>;
      const stagingJob = deployJobs["migrate-and-deploy"] ?? deployJobs["deploy-staging"];
      expect(stagingJob).toBeDefined();

      const deploySteps = (stagingJob?.["steps"] as Array<{ name?: string; run?: string }>) ?? [];
      const deployRunCommands = deploySteps.map((s) => s.run ?? "").join("\n");

      expect(deployRunCommands).toContain("prisma migrate deploy");
      expect(deployRunCommands).toContain("curl");

      // Safety properties: deploy only after CI passes, never skip steps silently, verify staging afterwards.
      const deployTriggers = deployWorkflow["on"] as Record<string, { workflows?: string[] } | undefined>;
      expect(deployTriggers["push"]).toBeUndefined();
      expect(deployTriggers["workflow_run"]?.workflows).toEqual(["CI Quality Gate"]);
      expect(String(stagingJob?.["if"])).toContain("conclusion == 'success'");
      expect(deploySteps.filter((s) => (s as { if?: string }).if !== undefined)).toEqual([]);
      expect(deployRunCommands).toContain("STAGING_DIRECT_URL is not set");
      expect(deployJobs["smoke"]?.["needs"]).toBe("migrate-and-deploy");

      // 3. Keep-alive workflow
      const keepAlivePath = resolve(rootDir, ".github/workflows/keep-alive.yml");
      expect(existsSync(keepAlivePath)).toBe(true);

      const keepAliveContent = readFileSync(keepAlivePath, "utf-8");
      const keepAliveWorkflow = YAML.parse(keepAliveContent) as Record<string, unknown>;

      const triggers = keepAliveWorkflow["on"] as Record<string, unknown>;
      expect(triggers["schedule"]).toBeDefined();
    });
  });
});
