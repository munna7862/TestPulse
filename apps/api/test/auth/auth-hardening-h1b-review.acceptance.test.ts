/**
 * Acceptance H1b-review: closes what the independent review of PR #12 found.
 * - TRUST_PROXY=true let clients spoof X-Forwarded-For on the deployed config (render.yaml).
 * - An unreachable Redis made auth requests hang ~40 s before the 503.
 * - The verify-email race test might never overlap; the mail-failure test proved too little.
 * - A synchronously throwing mailer would turn into a 500 only for existing accounts.
 * - ConsoleMailer printed reset and verification tokens in production logs.
 */
import crypto from "node:crypto";
import { EnvValidationError } from "@testpulse/shared";
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { ConsoleMailer, type Mailer, TestMailer } from "../../src/lib/mailer";
import type { Redis } from "../../src/lib/redis";
import { AuthService } from "../../src/modules/auth/auth.service";
import * as passwordUtils from "../../src/modules/auth/password";
import { RedisRateLimitStore } from "../../src/modules/auth/rate-limiter";

const testDb = useTestDatabase();
const ORIGIN = "https://testpulse.example.com";
const PASSWORD = "ValidPassword123!";
const BASE_ENV = {
  NODE_ENV: "production",
  JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
  JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
  APP_URL: ORIGIN,
  WEB_ORIGIN: ORIGIN,
  AUTH_GENERIC_RESPONSE_MIN_MS: "0",
};

const apps: FastifyInstance[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createApp(
  overrides: Record<string, string> = {},
  options: Partial<Parameters<typeof buildApp>[0]> = {},
): Promise<FastifyInstance> {
  const app = await buildApp({
    env: loadApiEnv({ ...BASE_ENV, ...overrides }),
    db: testDb.db,
    mailer: new TestMailer(),
    logger: false,
    ...options,
  });
  await app.ready();
  apps.push(app);
  return app;
}

async function login(app: FastifyInstance, email: string, remoteAddress: string, forwardedFor?: string) {
  return app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password: "WrongPassword!" },
    remoteAddress,
    headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
  });
}

describe("Acceptance H1b-review: client IP behind the real proxy chain", () => {
  it("[SC-AUTH-017] TRUST_PROXY=true is rejected at startup because it trusts client-supplied X-Forwarded-For", () => {
    expect(() => loadApiEnv({ ...BASE_ENV, TRUST_PROXY: "true" })).toThrow(EnvValidationError);
  });

  it("[SC-AUTH-017] with TRUST_PROXY=1 the per-IP limit keys on the address the proxy appended, not spoofed entries", async () => {
    const app = await createApp({ TRUST_PROXY: "1" });
    const proxy = "10.10.0.5"; // Render's load balancer, the socket peer
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      // The attacker controls everything left of the entry the proxy appends (198.51.100.7).
      const res = await login(app, `chain-${i}@example.com`, proxy, `6.6.${i}.6, 198.51.100.7`);
      statuses.push(res.statusCode);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);

    const otherClient = await login(app, "chain-other@example.com", proxy, "6.6.6.6, 198.51.100.8");
    expect(otherClient.statusCode).toBe(401);
  });

  it("[SC-AUTH-017] TRUST_PROXY accepts a comma-separated list of trusted proxy addresses or CIDRs", () => {
    const env = loadApiEnv({ ...BASE_ENV, TRUST_PROXY: "10.0.0.0/8, 127.0.0.1" });
    expect(env.TRUST_PROXY).toEqual(["10.0.0.0/8", "127.0.0.1"]);
    expect(loadApiEnv({ ...BASE_ENV, TRUST_PROXY: "false" }).TRUST_PROXY).toBe(false);
    expect(loadApiEnv({ ...BASE_ENV, TRUST_PROXY: "2" }).TRUST_PROXY).toBe(2);
  });
});

describe("Acceptance H1b-review: an unreachable limit store fails fast", () => {
  it("[SC-AUTH-017] a Redis command that never answers yields 503 within the store timeout", async () => {
    const silentRedis = { eval: () => new Promise<never>(() => undefined) } as unknown as Redis;
    const app = await createApp({}, { rateLimitStore: new RedisRateLimitStore(silentRedis, "tp:test", 300) });

    const started = performance.now();
    const res = await login(app, "slow-redis@example.com", "203.0.113.120");
    expect(res.statusCode).toBe(503);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});

describe("Acceptance H1b-review: single-use verification tokens under forced overlap", () => {
  it("[SC-AUTH-005] five verifications that all pass the pre-check still consume the token exactly once", async () => {
    const mailer = new TestMailer();
    const app = await createApp({}, { mailer });
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "overlap@example.com", password: PASSWORD, name: "Overlap" },
      remoteAddress: "203.0.113.130",
    });
    const token = mailer.findEmailsTo("overlap@example.com")[0]?.token ?? "";
    expect(token).not.toBe("");

    // Hold every transaction until all five requests have passed the findFirst pre-check, so they truly race.
    const runTransaction = testDb.db.$transaction.bind(testDb.db) as (...args: unknown[]) => Promise<unknown>;
    let arrived = 0;
    let release: () => void = () => undefined;
    const allArrived = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(testDb.db, "$transaction").mockImplementation(async (...args: unknown[]) => {
      arrived += 1;
      if (arrived >= 5) release();
      await Promise.race([allArrived, new Promise((resolve) => setTimeout(resolve, 2_000))]);
      return runTransaction(...args);
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        app.inject({
          method: "POST",
          url: "/api/v1/auth/verify-email",
          payload: { token },
          remoteAddress: `203.0.113.${131 + i}`,
        }),
      ),
    );
    expect(arrived).toBe(5);
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect(results.filter((r) => r.statusCode === 400)).toHaveLength(4);
  });
});

describe("Acceptance H1b-review: mail delivery never shapes the response", () => {
  function serviceWith(mailer: Mailer, onMailError: (error: unknown) => void): AuthService {
    return new AuthService({
      db: testDb.db,
      mailer,
      jwtSign: () => "signed",
      env: loadApiEnv(BASE_ENV),
      onMailError,
    });
  }

  async function seedUser(email: string): Promise<void> {
    await testDb.db.user.create({
      data: { email, name: "Mail", passwordHash: await passwordUtils.hashPassword(PASSWORD) },
    });
  }

  it("[SC-AUTH-001] a mail provider that never answers does not delay register, resend or forgot", async () => {
    const mailer = new TestMailer();
    const hang = () => new Promise<void>(() => undefined);
    const verifySpy = vi.spyOn(mailer, "sendVerificationEmail").mockImplementation(hang);
    const resetSpy = vi.spyOn(mailer, "sendPasswordResetEmail").mockImplementation(hang);
    const service = serviceWith(mailer, () => undefined);
    await seedUser("hang-known@example.com");

    await expect(
      service.register({ email: "hang-new@example.com", password: PASSWORD, name: "H" }),
    ).resolves.toBeDefined();
    await expect(service.resendVerification("hang-known@example.com")).resolves.toBeDefined();
    await expect(service.forgotPassword("hang-known@example.com")).resolves.toBeDefined();
    expect(verifySpy).toHaveBeenCalledTimes(2);
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it("[SC-AUTH-011] rejecting and synchronously throwing mailers are reported to onMailError, never to the caller", async () => {
    const mailer = new TestMailer();
    vi.spyOn(mailer, "sendPasswordResetEmail").mockRejectedValue(new Error("SMTP down"));
    vi.spyOn(mailer, "sendVerificationEmail").mockImplementation(() => {
      throw new Error("misconfigured transport");
    });
    const onMailError = vi.fn();
    const service = serviceWith(mailer, onMailError);
    await seedUser("throw-known@example.com");

    await expect(service.forgotPassword("throw-known@example.com")).resolves.toBeDefined();
    await expect(service.resendVerification("throw-known@example.com")).resolves.toBeDefined();
    await vi.waitFor(() => expect(onMailError).toHaveBeenCalledTimes(2));
  });

  it("[SC-AUTH-011] ConsoleMailer withholds tokens and links when told not to reveal secrets", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const token = crypto.randomBytes(32).toString("hex");
    await new ConsoleMailer({ revealSecrets: false }).sendPasswordResetEmail({
      to: "user@example.com",
      name: "User",
      token,
      resetUrl: `${ORIGIN}/reset-password?token=${token}`,
    });
    const printed = info.mock.calls.flat().join("\n");
    expect(printed).toContain("user@example.com");
    expect(printed).not.toContain(token);
  });
});
