import { ApiFailureSchema, apiSuccess, ForgotPasswordResponseSchema } from "@testpulse/shared";
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";

const testDb = useTestDatabase();

describe("Auth: Password Reset Integration", () => {
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

    // Register test user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "resetme@example.com",
        password: "OldPassword123!",
        name: "Reset User",
      },
    });
    await testDb.db.user.update({
      where: { email: "resetme@example.com" },
      data: { emailVerifiedAt: new Date() },
    });
  });

  beforeEach(() => {
    testMailer.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it("[SC-AUTH-011] Password reset requested for an unknown email and known email returns generic 202", async () => {
    // 1. Unknown email
    const unknownRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/password/forgot",
      payload: { email: "ghost-account@example.com" },
    });
    expect(unknownRes.statusCode).toBe(202);
    const unknownBody = apiSuccess(ForgotPasswordResponseSchema).parse(unknownRes.json());
    expect(unknownBody.success).toBe(true);
    expect(unknownBody.data.message).toContain("password reset instructions");
    // No email sent
    expect(testMailer.getSentEmails()).toHaveLength(0);

    // 2. Known email
    const knownRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/password/forgot",
      payload: { email: "resetme@example.com" },
    });
    expect(knownRes.statusCode).toBe(202);
    const knownBody = apiSuccess(ForgotPasswordResponseSchema).parse(knownRes.json());
    expect(knownBody.success).toBe(true);
    expect(knownBody.data.message).toContain("password reset instructions");

    // Email was sent with reset token
    const sent = testMailer.getLastEmail();
    expect(sent).toBeDefined();
    expect(sent?.to).toBe("resetme@example.com");
    expect(sent?.token).toBeDefined();
    expect(sent?.url).toContain("/reset-password?token=");
  });

  it("[SC-AUTH-012] Reset confirmed with a valid token changes password and revokes all sessions", async () => {
    // 1. Establish an active session for the user
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "resetme@example.com", password: "OldPassword123!" },
    });
    const accessCookie = loginRes.cookies.find((c) => c.name === "tp_access")?.value ?? "";

    // 2. Request password reset
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/password/forgot",
      payload: { email: "resetme@example.com" },
    });
    const resetToken = testMailer.getLastEmail()?.token ?? "";

    // 3. Confirm password reset
    const resetConfirmRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset",
      payload: {
        token: resetToken,
        newPassword: "BrandNewPassword123!",
      },
    });
    expect(resetConfirmRes.statusCode).toBe(200);

    // 4. Old active session must now be revoked
    const sessionCheck = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { tp_access: accessCookie },
    });
    expect(sessionCheck.statusCode).toBe(401);

    // 5. Old password no longer works
    const oldLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "resetme@example.com", password: "OldPassword123!" },
    });
    expect(oldLoginRes.statusCode).toBe(401);

    // 6. New password works
    const newLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "resetme@example.com", password: "BrandNewPassword123!" },
    });
    expect(newLoginRes.statusCode).toBe(200);

    // 7. Token reuse rejected
    const reuseRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset",
      payload: {
        token: resetToken,
        newPassword: "AnotherNewPassword123!",
      },
    });
    expect(reuseRes.statusCode).toBe(400);
    const reuseBody = ApiFailureSchema.parse(reuseRes.json());
    expect(reuseBody.error.code).toBe("INVALID_TOKEN");
  });
});
