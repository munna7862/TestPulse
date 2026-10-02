import { ApiFailureSchema, apiSuccess, RegisterResponseSchema, VerifyEmailResponseSchema } from "@testpulse/shared";
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";

const testDb = useTestDatabase();

describe("Auth: Register and Verify Integration", () => {
  let app: FastifyInstance;
  let testMailer: TestMailer;

  beforeAll(async () => {
    testMailer = new TestMailer();
    const env = loadApiEnv({
      NODE_ENV: "test",
      JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
      APP_URL: "http://localhost:3000",
      WEB_ORIGIN: "http://localhost:3000",
    });

    app = await buildApp({
      env,
      db: testDb.db,
      mailer: testMailer,
      logger: false,
    });
    await app.ready();
  });

  beforeEach(() => {
    testMailer.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it("[SC-AUTH-001] A new email registers with a valid password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "alice@example.com",
        password: "SuperSecretPassword123!",
        name: "Alice Smith",
      },
    });

    expect(response.statusCode).toBe(202);
    const body = apiSuccess(RegisterResponseSchema).parse(response.json());
    expect(body.success).toBe(true);
    expect(body.data.message).toContain("verification link");

    // Verify user created unverified in database
    const user = await testDb.db.user.findUnique({
      where: { email: "alice@example.com" },
    });
    expect(user).not.toBeNull();
    expect(user?.emailVerifiedAt).toBeNull();
    expect(user?.name).toBe("Alice Smith");

    // Verify verification email captured by test transport
    const sent = testMailer.getLastEmail();
    expect(sent).toBeDefined();
    expect(sent?.to).toBe("alice@example.com");
    expect(sent?.token).toBeDefined();
    expect(sent?.url).toContain("/verify-email?token=");
  });

  it("[SC-AUTH-002] An already-registered email registers again", async () => {
    // Attempt registration with identical email
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "alice@example.com",
        password: "AnotherPassword456!",
        name: "Alice Imposter",
      },
    });

    // Identical generic 202 response to prevent account enumeration
    expect(response.statusCode).toBe(202);
    const body = apiSuccess(RegisterResponseSchema).parse(response.json());
    expect(body.success).toBe(true);
    expect(body.data.message).toContain("verification link");

    // User data in DB must remain unchanged
    const users = await testDb.db.user.findMany({
      where: { email: "alice@example.com" },
    });
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe("Alice Smith");

    // No new verification email sent to attacker
    expect(testMailer.getSentEmails()).toHaveLength(0);
  });

  it("[SC-AUTH-003] Registration with a password under 10 characters or a malformed email", async () => {
    // Short password
    const shortPassRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "bob@example.com",
        password: "short",
        name: "Bob",
      },
    });
    expect(shortPassRes.statusCode).toBe(400);
    const shortBody = ApiFailureSchema.parse(shortPassRes.json());
    expect(shortBody.error.code).toBe("VALIDATION_ERROR");

    // Malformed email
    const malformedEmailRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "not-an-email",
        password: "ValidPassword123!",
        name: "Bob",
      },
    });
    expect(malformedEmailRes.statusCode).toBe(400);
    const malformedBody = ApiFailureSchema.parse(malformedEmailRes.json());
    expect(malformedBody.error.code).toBe("VALIDATION_ERROR");

    // Nothing was persisted
    const bob = await testDb.db.user.findFirst({
      where: { name: "Bob" },
    });
    expect(bob).toBeNull();
  });

  it("[SC-AUTH-004] A valid verification token is submitted", async () => {
    // Register Charlie
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "charlie@example.com",
        password: "CharliePassword123!",
        name: "Charlie",
      },
    });

    const email = testMailer.getLastEmail();
    expect(email).toBeDefined();
    const token = email?.token ?? "";

    // Submit verification
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = apiSuccess(VerifyEmailResponseSchema).parse(verifyRes.json());
    expect(verifyBody.data.verified).toBe(true);

    // Verify database state: emailVerifiedAt is set
    const user = await testDb.db.user.findUnique({
      where: { email: "charlie@example.com" },
    });
    expect(user?.emailVerifiedAt).not.toBeNull();

    // Verify token marked used
    const userId = user?.id ?? "";
    const tokenRecord = await testDb.db.verificationToken.findFirst({
      where: { userId },
    });
    expect(tokenRecord?.usedAt).not.toBeNull();
  });

  it("[SC-AUTH-005] An expired, used, or tampered verification token is submitted", async () => {
    // Register Dan to get a fresh token
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "dan@example.com",
        password: "DanPassword123!",
        name: "Dan",
      },
    });

    const token = testMailer.getLastEmail()?.token ?? "";

    // 1. Verify successfully once
    const firstVerify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token },
    });
    expect(firstVerify.statusCode).toBe(200);

    // 2. Token reuse rejected
    const reuseRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token },
    });
    expect(reuseRes.statusCode).toBe(400);
    const reuseBody = ApiFailureSchema.parse(reuseRes.json());
    expect(reuseBody.error.code).toBe("INVALID_TOKEN");

    // 3. Tampered token rejected
    const tamperedRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify-email",
      payload: { token: "dummy-tampered-token-sample-min-32-chars" },
    });
    expect(tamperedRes.statusCode).toBe(400);
    const tamperedBody = ApiFailureSchema.parse(tamperedRes.json());
    expect(tamperedBody.error.code).toBe("INVALID_TOKEN");
  });

  it("[SC-AUTH-019] An unverified user tries to perform a restricted action", async () => {
    // Register unverified Dave
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "dave@example.com",
        password: "DavePassword123!",
        name: "Dave",
      },
    });

    // Dave logs in while unverified
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "dave@example.com",
        password: "DavePassword123!",
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const cookies = loginRes.cookies;

    // Dave attempts restricted action
    const accessCookie = cookies.find((c) => c.name === "tp_access")?.value ?? "";
    const restrictedRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/restricted-action",
      headers: {
        origin: "http://localhost:3000",
      },
      cookies: {
        tp_access: accessCookie,
      },
    });

    expect(restrictedRes.statusCode).toBe(403);
    const body = ApiFailureSchema.parse(restrictedRes.json());
    expect(body.error.code).toBe("EMAIL_NOT_VERIFIED");
  });
});
