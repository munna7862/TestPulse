import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { Writable } from "node:stream";
import { useTestDatabase } from "@testpulse/db/testing";
import { ApiFailureSchema, apiSuccess, HealthSchema, WEB_PROXY_SECRET_HEADER } from "@testpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import type { RateLimitStore } from "../../src/modules/auth/rate-limiter";
import { callAs, createUser, ORIGIN } from "../orgs/helpers";

const testDb = useTestDatabase();
const apps: FastifyInstance[] = [];

async function createApp(rateLimitStore?: RateLimitStore, loggerStream?: Writable) {
  const app = await buildApp({
    env: loadApiEnv({ NODE_ENV: "test", WEB_ORIGIN: ORIGIN }),
    db: testDb.db,
    mailer: new TestMailer(),
    logger: Boolean(loggerStream),
    ...(rateLimitStore ? { rateLimitStore } : {}),
    ...(loggerStream ? { loggerStream } : {}),
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

it.each(["logout", "logout-all"])(
  "[SC-AUTH-010] allows %s after exhausting the shared REST budget",
  async (endpoint) => {
    const app = await createApp({
      hit: (key, resetMs) => Promise.resolve({ count: key.startsWith("rest:") ? 601 : 1, resetMs }),
    });
    const user = await createUser(app, testDb.db, `${randomUUID()}@example.com`);

    expect((await callAs(app, user, "GET", "/api/v1/auth/me")).statusCode).toBe(429);
    expect((await callAs(app, user, "POST", `/api/v1/auth/${endpoint}`)).statusCode).toBe(200);
    expect((await callAs(app, user, "GET", "/api/v1/auth/me")).statusCode).toBe(401);
  },
);

it("[SC-ORG-013] [SC-SEC-012] fails closed on invitation acceptance while REST continues and logs an outage", async () => {
  const logged: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      logged.push(String(chunk));
      done();
    },
  });
  const app = await createApp(
    {
      async hit(key, resetMs) {
        if (key.startsWith("rest:") || key.startsWith("invite-accept:")) throw new Error("store unavailable");
        return { count: 1, resetMs };
      },
    },
    stream,
  );
  const user = await createUser(app, testDb.db, `${randomUUID()}@example.com`);
  expect((await callAs(app, user, "GET", "/api/v1/orgs")).statusCode).toBe(200);
  expect(logged.some((line) => line.includes("rate-limit store unavailable; continuing request"))).toBe(true);

  const result = await callAs(app, user, "POST", "/api/v1/invitations/accept", { token: randomUUID() });
  expect(result.statusCode).toBe(503);
  expect(ApiFailureSchema.parse(result.json()).error.code).toBe("SERVICE_UNAVAILABLE");
});

it("[SC-SEC-006] censors the proxy credential in structured API headers and errors", async () => {
  const logged: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      logged.push(String(chunk));
      done();
    },
  });
  const app = await createApp(undefined, stream);
  const credential = randomUUID();
  const headers = { [WEB_PROXY_SECRET_HEADER]: credential, accept: "application/json" };
  app.log.info({ headers, err: { config: { headers } } }, "credential redaction probe");
  const output = logged.join("");
  expect(output).not.toContain(credential);
  expect(output.match(/\[REDACTED\]/g)).toHaveLength(2);
  expect(output).toContain("application/json");
});

it("[SC-OPS-001] serves health and a controlled OAuth response when Redis is unavailable at production boot", async () => {
  const portProbe = createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const address = portProbe.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve an API test port");
  const closed = once(portProbe, "close");
  portProbe.close();
  await closed;

  const api = spawn(process.execPath, ["--import", "tsx", resolve("src/server.ts")], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(address.port),
      DATABASE_URL: testDb.url,
      REDIS_URL: "redis://127.0.0.1:1",
      RUN_WORKERS_IN_PROCESS: "true",
      JWT_ACCESS_SECRET: randomUUID(),
      JWT_REFRESH_SECRET: randomUUID(),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let startupOutput = "";
  for (const stream of [api.stdout, api.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk: string) => {
      startupOutput = (startupOutput + chunk).slice(-4_000);
    });
  }
  try {
    const origin = `http://127.0.0.1:${address.port}`;
    await vi.waitFor(
      async () => {
        const response = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(3_000) });
        expect(response.status).toBe(200);
        expect(apiSuccess(HealthSchema).parse(await response.json()).data.dependencies).toEqual({
          database: "up",
          redis: "down",
        });
      },
      { timeout: 45_000, interval: 100 },
    );
    const response = await fetch(`${origin}/api/v1/auth/oauth/google/start`, { redirect: "manual" });
    expect(response.status).toBe(503);
    expect(ApiFailureSchema.parse(await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  } catch (error) {
    throw new Error(`API startup probe failed (process exit ${api.exitCode ?? "pending"}):\n${startupOutput}`, {
      cause: error,
    });
  } finally {
    if (api.exitCode === null && api.signalCode === null) {
      const exited = once(api, "exit");
      api.kill();
      await exited;
    }
  }
}, 60_000);
