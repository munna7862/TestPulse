/**
 * Vitest globalSetup shared by every workspace that needs PostgreSQL (docs/testing/testing-strategy.md §2.1).
 *
 * - If DATABASE_URL_TEST is set (CI service container, native install, Neon branch), it is used as the
 *   admin connection (must be allowed to CREATE/DROP DATABASE).
 * - Otherwise a throwaway embedded PostgreSQL 16 is started in a CHILD process (see pg-server.mjs for
 *   why it must not run inside the Vitest process) and removed afterwards, so tests run on
 *   Windows/macOS/Linux without Docker or a system-wide install.
 */
import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import "./provided-context";

const serverScript = path.join(path.dirname(fileURLToPath(import.meta.url)), "pg-server.mjs");

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function startPostgres(port: number): Promise<{ child: ChildProcess; url: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverScript, String(port)], { stdio: ["pipe", "pipe", "inherit"] });
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Embedded PostgreSQL did not start within 120 s"));
    }, 120_000);
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      output += chunk;
      const match = /READY (\S+)/.exec(output);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve({ child, url: match[1] });
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Embedded PostgreSQL exited early (code ${code ?? "null"})`));
    });
  });
}

export default async function setup(project: TestProject): Promise<(() => Promise<void>) | undefined> {
  const external = process.env.DATABASE_URL_TEST;
  if (external) {
    project.provide("pgAdminUrl", external);
    return undefined;
  }

  const { child, url } = await startPostgres(await freePort());
  child.removeAllListeners("exit");
  project.provide("pgAdminUrl", url);

  return async () => {
    await new Promise<void>((resolve) => {
      const force = setTimeout(() => {
        child.kill();
        resolve();
      }, 30_000);
      child.once("exit", () => {
        clearTimeout(force);
        resolve();
      });
      child.stdin?.end("stop\n");
    });
  };
}
