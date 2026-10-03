import { ApiFailureSchema, apiSuccess, AuthMeResponseSchema, LoginResponseSchema } from "@testpulse/shared";
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";

const testDb = useTestDatabase();

describe("Auth: Login, Refresh, Session Management & CSRF", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const env = loadApiEnv({
      NODE_ENV: "production", // Test secure cookie attribute
      // Not a rate-limit test: generous limits so many logins from one address don't trip them.
      AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: "1000",
      AUTH_RATE_LIMIT_LOGIN_PER_EMAIL_PER_15_MIN: "1000",
      AUTH_RATE_LIMIT_RECOVERY_PER_HOUR: "1000",
      AUTH_RATE_LIMIT_RECOVERY_PER_EMAIL_PER_HOUR: "1000",
      AUTH_GENERIC_RESPONSE_MIN_MS: "0",
      JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
      APP_URL: "https://testpulse.example.com",
      WEB_ORIGIN: "https://testpulse.example.com",
    });

    app = await buildApp({
      env,
      db: testDb.db,
      mailer: new TestMailer(),
      logger: false,
    });
    await app.ready();

    // Register and verify a test user for login tests
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "logintester@example.com",
        password: "ValidPassword123!",
        name: "Login Tester",
      },
    });
    await testDb.db.user.update({
      where: { email: "logintester@example.com" },
      data: { emailVerifiedAt: new Date() },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("[SC-AUTH-006] Login with correct credentials sets secure cookies and exposes no token in body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "logintester@example.com",
        password: "ValidPassword123!",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = apiSuccess(LoginResponseSchema).parse(response.json());
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("logintester@example.com");

    // Critical ADR-005 security check: No token exposed in body
    expect(response.body).not.toContain("accessToken");
    expect(response.body).not.toContain("refreshToken");

    // Verify cookies: HttpOnly; Secure; SameSite=Lax
    const accessCookie = response.cookies.find((c) => c.name === "tp_access");
    const refreshCookie = response.cookies.find((c) => c.name === "tp_refresh");

    expect(accessCookie).toBeDefined();
    expect(accessCookie?.httpOnly).toBe(true);
    expect(accessCookie?.secure).toBe(true);
    expect(accessCookie?.sameSite?.toLowerCase()).toBe("lax");
    expect(accessCookie?.path).toBe("/");

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie?.httpOnly).toBe(true);
    expect(refreshCookie?.secure).toBe(true);
    expect(refreshCookie?.sameSite?.toLowerCase()).toBe("lax");
    expect(refreshCookie?.path).toBe("/api/v1/auth");

    // Authenticated request to /auth/me returns the user
    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { tp_access: accessCookie?.value ?? "" },
    });
    expect(meRes.statusCode).toBe(200);
    const meBody = apiSuccess(AuthMeResponseSchema).parse(meRes.json());
    expect(meBody.data.user.email).toBe("logintester@example.com");
  });

  it("[SC-AUTH-007] Login with wrong password or unknown email returns identical 401", async () => {
    // 1. Existing user, wrong password
    const wrongPassRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "logintester@example.com",
        password: "WrongPassword123!",
      },
    });
    expect(wrongPassRes.statusCode).toBe(401);
    const wrongPassBody = ApiFailureSchema.parse(wrongPassRes.json());
    expect(wrongPassBody.error.message).toBe("Invalid email or password.");

    // 2. Unknown user email
    const unknownEmailRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "unknown-account@example.com",
        password: "AnyPassword123!",
      },
    });
    expect(unknownEmailRes.statusCode).toBe(401);
    const unknownEmailBody = ApiFailureSchema.parse(unknownEmailRes.json());
    expect(unknownEmailBody.error.message).toBe("Invalid email or password.");

    // Messages must be identical to eliminate timing/message enumeration
    expect(wrongPassBody.error).toEqual(unknownEmailBody.error);
  });

  it("[SC-AUTH-008] Refresh with a valid refresh cookie rotates tokens", async () => {
    // Login to get initial cookies
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "logintester@example.com",
        password: "ValidPassword123!",
      },
    });
    const oldRefreshCookie = loginRes.cookies.find((c) => c.name === "tp_refresh");
    const oldRefreshValue = oldRefreshCookie?.value ?? "";

    // Call refresh with valid origin
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        origin: "https://testpulse.example.com",
      },
      cookies: {
        tp_refresh: oldRefreshValue,
      },
    });

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.cookies.some((c) => c.name === "tp_access")).toBe(true);
    const newRefreshCookie = refreshRes.cookies.find((c) => c.name === "tp_refresh");

    expect(newRefreshCookie?.value).not.toBe(oldRefreshValue);

    // Old refresh token must be invalidated
    const secondRefreshRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        origin: "https://testpulse.example.com",
      },
      cookies: {
        tp_refresh: oldRefreshValue,
      },
    });
    expect(secondRefreshRes.statusCode).toBe(401);
  });

  it("[SC-AUTH-009] Already-rotated refresh token reuse revokes the whole token family", async () => {
    // 1. Initial Login
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "logintester@example.com",
        password: "ValidPassword123!",
      },
    });
    const tokenA = loginRes.cookies.find((c) => c.name === "tp_refresh")?.value ?? "";

    // 2. Legitimate refresh: rotates token A -> token B
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { origin: "https://testpulse.example.com" },
      cookies: { tp_refresh: tokenA },
    });
    expect(refreshRes.statusCode).toBe(200);
    const tokenB = refreshRes.cookies.find((c) => c.name === "tp_refresh")?.value ?? "";

    // 3. Attacker replays stolen token A (already rotated)
    const attackRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { origin: "https://testpulse.example.com" },
      cookies: { tp_refresh: tokenA },
    });
    expect(attackRes.statusCode).toBe(401);
    const attackBody = ApiFailureSchema.parse(attackRes.json());
    expect(attackBody.error.code).toBe("TOKEN_REUSE_DETECTED");

    // 4. Token B (and all sessions in family) must now be revoked
    const legitSubsequentRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { origin: "https://testpulse.example.com" },
      cookies: { tp_refresh: tokenB },
    });
    expect(legitSubsequentRes.statusCode).toBe(401);
  });

  it("[SC-AUTH-010] Logout revokes the current session; logout-all revokes all sessions", async () => {
    // Session 1
    const s1Login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "logintester@example.com", password: "ValidPassword123!" },
    });
    const s1Access = s1Login.cookies.find((c) => c.name === "tp_access")?.value ?? "";

    // Session 2
    const s2Login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "logintester@example.com", password: "ValidPassword123!" },
    });
    const s2Access = s2Login.cookies.find((c) => c.name === "tp_access")?.value ?? "";

    // Single logout on Session 1
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { origin: "https://testpulse.example.com" },
      cookies: { tp_access: s1Access },
    });
    expect(logoutRes.statusCode).toBe(200);

    // Session 1 is now rejected
    const s1Check = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { tp_access: s1Access },
    });
    expect(s1Check.statusCode).toBe(401);

    // Session 2 is still active
    const s2Check = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { tp_access: s2Access },
    });
    expect(s2Check.statusCode).toBe(200);

    // Logout-all called from Session 2
    const logoutAllRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout-all",
      headers: { origin: "https://testpulse.example.com" },
      cookies: { tp_access: s2Access },
    });
    expect(logoutAllRes.statusCode).toBe(200);

    // Session 2 is now also rejected
    const s2SubsequentCheck = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { tp_access: s2Access },
    });
    expect(s2SubsequentCheck.statusCode).toBe(401);
  });

  it("[SC-AUTH-018] A cookie-authenticated POST arrives with a foreign Origin header", async () => {
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "logintester@example.com", password: "ValidPassword123!" },
    });
    const accessCookie = loginRes.cookies.find((c) => c.name === "tp_access")?.value ?? "";

    // Malicious request with foreign Origin
    const csrfAttackRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        origin: "https://evil-attacker-site.com",
      },
      cookies: {
        tp_access: accessCookie,
      },
    });

    expect(csrfAttackRes.statusCode).toBe(403);
    const csrfBody = ApiFailureSchema.parse(csrfAttackRes.json());
    expect(csrfBody.error.code).toBe("FORBIDDEN");

    // Session was NOT revoked
    const checkRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { tp_access: accessCookie },
    });
    expect(checkRes.statusCode).toBe(200);
  });
});
