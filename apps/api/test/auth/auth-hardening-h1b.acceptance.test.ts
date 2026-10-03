/**
 * Acceptance H1b: closes the gaps the independent review found in H1 (PR #10 review comment, task.md G4, G5, G7).
 * Every group builds its own app, so rate-limit counters never leak between groups. Client IPs are simulated
 * with Fastify's `remoteAddress` (the real socket address), never with a spoofable X-Forwarded-For header.
 * Limits are the shipped defaults from env.ts, not test overrides.
 */
import crypto from "node:crypto";
import { ApiFailureSchema } from "@testpulse/shared";
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import type { RateLimitStore } from "../../src/modules/auth/rate-limiter";
import * as passwordUtils from "../../src/modules/auth/password";

const testDb = useTestDatabase();
const ORIGIN = "https://testpulse.example.com";
const PASSWORD = "ValidPassword123!";

const apps: FastifyInstance[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createApp(
  overrides: Record<string, string> = {},
  options: { rateLimitStore?: RateLimitStore; mailer?: TestMailer } = {},
): Promise<{ app: FastifyInstance; mailer: TestMailer }> {
  const mailer = options.mailer ?? new TestMailer();
  const app = await buildApp({
    env: loadApiEnv({
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
      APP_URL: ORIGIN,
      WEB_ORIGIN: ORIGIN,
      AUTH_GENERIC_RESPONSE_MIN_MS: "0",
      ...overrides,
    }),
    db: testDb.db,
    mailer,
    logger: false,
    ...(options.rateLimitStore ? { rateLimitStore: options.rateLimitStore } : {}),
  });
  await app.ready();
  apps.push(app);
  return { app, mailer };
}

async function post(
  app: FastifyInstance,
  url: string,
  payload: Record<string, unknown>,
  remoteAddress: string,
  headers: Record<string, string> = {},
) {
  return app.inject({ method: "POST", url: `/api/v1/auth${url}`, payload, remoteAddress, headers });
}

async function createVerifiedUser(email: string): Promise<void> {
  await testDb.db.user.create({
    data: {
      email,
      name: "H1b Tester",
      passwordHash: await passwordUtils.hashPassword(PASSWORD),
      emailVerifiedAt: new Date(),
    },
  });
}

const fakeToken = () => crypto.randomBytes(32).toString("hex");

describe("Acceptance H1b: rate limits that hold (G4)", () => {
  it("[SC-AUTH-017] login allows 10 attempts per IP per minute, then returns 429 only for that IP", async () => {
    const { app } = await createApp();
    for (let i = 0; i < 10; i++) {
      const res = await post(
        app,
        "/login",
        { email: `ip-${i}@example.com`, password: "WrongPassword!" },
        "203.0.113.10",
      );
      expect(res.statusCode).toBe(401);
    }
    const blocked = await post(
      app,
      "/login",
      { email: "ip-x@example.com", password: "WrongPassword!" },
      "203.0.113.10",
    );
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(ApiFailureSchema.parse(blocked.json()).error.code).toBe("RATE_LIMITED");

    const otherIp = await post(
      app,
      "/login",
      { email: "ip-y@example.com", password: "WrongPassword!" },
      "203.0.113.11",
    );
    expect(otherIp.statusCode).toBe(401);
  });

  it("[SC-AUTH-017] a spoofed X-Forwarded-For header does not reset the per-IP counter when TRUST_PROXY is off", async () => {
    const { app } = await createApp();
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await post(
        app,
        "/login",
        { email: `spoof-${i}@example.com`, password: "WrongPassword!" },
        "203.0.113.20",
        { "x-forwarded-for": `10.0.${i}.1` },
      );
      statuses.push(res.statusCode);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it("[SC-AUTH-017] login allows 5 attempts per account per 15 minutes from any mix of IPs and email casing", async () => {
    const { app } = await createApp();
    const email = "victim@example.com";
    await createVerifiedUser(email);
    for (let i = 0; i < 5; i++) {
      const variant = i % 2 === 0 ? email : email.toUpperCase();
      const res = await post(app, "/login", { email: variant, password: "WrongPassword!" }, `198.18.0.${i + 1}`);
      expect(res.statusCode).toBe(401);
    }
    const blocked = await post(app, "/login", { email, password: PASSWORD }, "198.18.0.99");
    expect(blocked.statusCode).toBe(429);
  });

  it("[SC-AUTH-017] register, resend-verification and forgot-password share a 5-per-hour limit per email", async () => {
    const { app } = await createApp();
    const email = "flooded@example.com";
    const routes = [
      "/password/forgot",
      "/resend-verification",
      "/password/forgot",
      "/resend-verification",
      "/password/forgot",
    ];
    for (const [i, route] of routes.entries()) {
      const res = await post(app, route, { email }, `198.19.0.${i + 1}`);
      expect(res.statusCode).toBe(202);
    }
    const blocked = await post(app, "/register", { email, password: PASSWORD, name: "Flood" }, "198.19.0.50");
    expect(blocked.statusCode).toBe(429);
  });

  it("[SC-AUTH-017] recovery and token routes share a 20-per-hour limit per IP, verify-email included", async () => {
    const { app } = await createApp();
    const ip = "203.0.113.30";
    const requests = [
      ...Array.from({ length: 5 }, (_, i) =>
        post(app, "/register", { email: `r-${i}@example.com`, password: PASSWORD, name: "R" }, ip),
      ),
      ...Array.from({ length: 5 }, (_, i) => post(app, "/resend-verification", { email: `v-${i}@example.com` }, ip)),
      ...Array.from({ length: 5 }, (_, i) => post(app, "/password/forgot", { email: `f-${i}@example.com` }, ip)),
      ...Array.from({ length: 3 }, () =>
        post(app, "/password/reset", { token: fakeToken(), newPassword: PASSWORD }, ip),
      ),
      ...Array.from({ length: 2 }, () => post(app, "/verify-email", { token: fakeToken() }, ip)),
    ];
    const statuses = [];
    for (const request of requests) statuses.push((await request).statusCode);
    expect(statuses).not.toContain(429);

    const blocked = await post(app, "/verify-email", { token: fakeToken() }, ip);
    expect(blocked.statusCode).toBe(429);
  });

  it("[SC-AUTH-017] fails closed with 503 when the limit store is unreachable", async () => {
    const brokenStore: RateLimitStore = {
      hit: () => Promise.reject(new Error("ECONNREFUSED")),
    };
    const { app } = await createApp({}, { rateLimitStore: brokenStore });
    const res = await post(app, "/login", { email: "any@example.com", password: "WrongPassword!" }, "203.0.113.40");
    expect(res.statusCode).toBe(503);
    expect(ApiFailureSchema.parse(res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });
});

describe("Acceptance H1b: no account enumeration through timing (G5)", () => {
  it("[SC-AUTH-002] registering an existing email still runs the argon2 password hash", async () => {
    const { app } = await createApp();
    await createVerifiedUser("taken@example.com");
    const hashSpy = vi.spyOn(passwordUtils, "hashPassword");

    const res = await post(
      app,
      "/register",
      { email: "taken@example.com", password: PASSWORD, name: "Dup" },
      "203.0.113.50",
    );
    expect(res.statusCode).toBe(202);
    expect(hashSpy).toHaveBeenCalledTimes(1);
  });

  it("[SC-AUTH-011] generic auth responses never return faster than the configured floor, for known and unknown emails", async () => {
    const { app } = await createApp({ AUTH_GENERIC_RESPONSE_MIN_MS: "80" });
    await createVerifiedUser("known@example.com");
    const cases: Array<[string, Record<string, unknown>]> = [
      ["/password/forgot", { email: "known@example.com" }],
      ["/password/forgot", { email: "unknown@example.com" }],
      ["/resend-verification", { email: "known@example.com" }],
      ["/resend-verification", { email: "unknown@example.com" }],
      ["/register", { email: "known@example.com", password: PASSWORD, name: "K" }],
    ];
    for (const [i, [route, payload]] of cases.entries()) {
      const started = performance.now();
      const res = await post(app, route, payload, `203.0.113.${60 + i}`);
      expect(res.statusCode).toBe(202);
      expect(performance.now() - started).toBeGreaterThanOrEqual(78);
    }
  });

  it("[SC-AUTH-001] a failing mailer does not change the register response", async () => {
    const mailer = new TestMailer();
    vi.spyOn(mailer, "sendVerificationEmail").mockRejectedValue(new Error("SMTP down"));
    const { app } = await createApp({}, { mailer });
    const res = await post(
      app,
      "/register",
      { email: "mailfail@example.com", password: PASSWORD, name: "M" },
      "203.0.113.70",
    );
    expect(res.statusCode).toBe(202);
  });
});

describe("Acceptance H1b: single-use tokens under concurrency (G7)", () => {
  it("[SC-AUTH-012] five concurrent resets with one token succeed exactly once", async () => {
    const { app, mailer } = await createApp();
    await createVerifiedUser("reset-race@example.com");
    await post(app, "/password/forgot", { email: "reset-race@example.com" }, "203.0.113.80");
    const token = mailer.findEmailsTo("reset-race@example.com")[0]?.token ?? "";
    expect(token).not.toBe("");

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        post(app, "/password/reset", { token, newPassword: `RacePassword${i}!xx` }, `203.0.113.${81 + i}`),
      ),
    );
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect(results.filter((r) => r.statusCode === 400)).toHaveLength(4);
  });

  it("[SC-AUTH-005] five concurrent verifications with one token succeed exactly once", async () => {
    const { app, mailer } = await createApp();
    await post(app, "/register", { email: "verify-race@example.com", password: PASSWORD, name: "V" }, "203.0.113.90");
    const token = mailer.findEmailsTo("verify-race@example.com")[0]?.token ?? "";
    expect(token).not.toBe("");

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => post(app, "/verify-email", { token }, `203.0.113.${91 + i}`)),
    );
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
  });
});

describe("Acceptance H1b: refresh errors are not treated as token reuse (G4 review F9)", () => {
  it("[SC-AUTH-009] a database failure during rotation returns 500 and leaves the session family active", async () => {
    const { app } = await createApp();
    await createVerifiedUser("refresh-db@example.com");
    const login = await post(app, "/login", { email: "refresh-db@example.com", password: PASSWORD }, "203.0.113.100");
    expect(login.statusCode).toBe(200);
    const refreshToken = login.cookies.find((c) => c.name === "tp_refresh")?.value ?? "";

    vi.spyOn(testDb.db, "$transaction").mockRejectedValueOnce(new Error("connection reset"));
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { origin: ORIGIN },
      cookies: { tp_refresh: refreshToken },
      remoteAddress: "203.0.113.100",
    });
    expect(res.statusCode).toBe(500);

    const user = await testDb.db.user.findFirstOrThrow({ where: { email: "refresh-db@example.com" } });
    const live = await testDb.db.session.count({ where: { userId: user.id, revokedAt: null } });
    expect(live).toBe(1);
  });
});
