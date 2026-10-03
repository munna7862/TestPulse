import { ApiFailureSchema } from "@testpulse/shared";
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import * as passwordUtils from "../../src/modules/auth/password";

const testDb = useTestDatabase();

describe("Acceptance H1: Auth Security Hardening (G4, G5, G6)", () => {
  let app: FastifyInstance;
  const userEmail = "hardening-tester@example.com";
  const userPassword = "ValidPassword123!";

  beforeAll(async () => {
    const env = loadApiEnv({
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
      APP_URL: "https://testpulse.example.com",
      WEB_ORIGIN: "https://testpulse.example.com",
      AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: "10",
      AUTH_RATE_LIMIT_RECOVERY_PER_HOUR: "20",
      AUTH_GENERIC_RESPONSE_MIN_MS: "0",
    });

    app = await buildApp({
      env,
      db: testDb.db,
      mailer: new TestMailer(),
      logger: false,
    });
    await app.ready();

    // Create verified user
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: userEmail,
        password: userPassword,
        name: "Hardening Tester",
      },
    });

    await testDb.db.user.update({
      where: { email: userEmail },
      data: { emailVerifiedAt: new Date() },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("G4 / SC-AUTH-017: Rate Limiting on Password Auth Routes", () => {
    it("rejects excessive login attempts from same IP with 429 Too Many Requests", async () => {
      const clientIp = "198.51.100.1";
      let hit429 = false;

      // Send 15 login attempts from the same IP (limit is 10/min)
      for (let i = 0; i < 15; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          remoteAddress: clientIp,
          payload: {
            email: "bruteforce@example.com",
            password: "WrongPassword!",
          },
        });

        if (res.statusCode === 429) {
          hit429 = true;
          expect(res.headers["retry-after"]).toBeDefined();
          const parsed = ApiFailureSchema.safeParse(res.json());
          expect(parsed.success).toBe(true);
          break;
        }
      }

      expect(hit429).toBe(true);
    });

    it("rejects excessive password reset / register attempts with 429", async () => {
      const clientIp = "198.51.100.2";
      let hit429 = false;

      // Send multiple forgot-password requests from same IP
      for (let i = 0; i < 25; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/v1/auth/password/forgot",
          remoteAddress: clientIp,
          payload: {
            email: `target-${i}@example.com`,
          },
        });

        if (res.statusCode === 429) {
          hit429 = true;
          expect(res.headers["retry-after"]).toBeDefined();
          break;
        }
      }

      expect(hit429).toBe(true);
    });
  });

  describe("G5 / ADR-005 §9 / T11: Timing Parity & Anti-Account Enumeration", () => {
    it("verifies dummy hash when logging in with unknown email to equalize response time", async () => {
      const verifySpy = vi.spyOn(passwordUtils, "verifyPassword");

      const unknownEmail = "definitely-nonexistent-user-12345@example.com";
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: unknownEmail,
          password: "SomePassword123!",
        },
      });

      expect(res.statusCode).toBe(401);
      const body = ApiFailureSchema.parse(res.json());
      expect(body.error.message).toBe("Invalid email or password.");

      // verifyPassword MUST be called even though user does not exist
      expect(verifySpy).toHaveBeenCalled();
      const calledHash = verifySpy.mock.calls[0]?.[0];
      expect(calledHash).toBeDefined();
      expect(typeof calledHash).toBe("string");

      verifySpy.mockRestore();
    });
  });

  describe("G6 / SC-AUTH-009: Atomic Refresh Token Concurrency & Reuse Revocation", () => {
    it("prevents duplicate session minting when concurrent refresh requests occur with same token", async () => {
      // 1. Log in to get refresh token
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: userEmail,
          password: userPassword,
        },
      });

      expect(loginRes.statusCode).toBe(200);
      const refreshCookie = loginRes.cookies.find((c) => c.name === "tp_refresh")?.value ?? "";
      expect(refreshCookie.length).toBeGreaterThan(0);

      // 2. Fire 2 simultaneous refresh requests with the EXACT same refresh token
      const [res1, res2] = await Promise.all([
        app.inject({
          method: "POST",
          url: "/api/v1/auth/refresh",
          headers: { origin: "https://testpulse.example.com" },
          cookies: { tp_refresh: refreshCookie },
        }),
        app.inject({
          method: "POST",
          url: "/api/v1/auth/refresh",
          headers: { origin: "https://testpulse.example.com" },
          cookies: { tp_refresh: refreshCookie },
        }),
      ]);

      // Exactly one request rotates the token; the loser is treated as reuse (review T1 strengthened this).
      const winner = [res1, res2].find((r) => r.statusCode === 200);
      const loser = [res1, res2].find((r) => r.statusCode === 401);
      expect(winner).toBeDefined();
      expect(loser).toBeDefined();
      expect(ApiFailureSchema.parse(loser?.json()).error.code).toBe("TOKEN_REUSE_DETECTED");

      // Reuse revokes the whole family, so even the winner's fresh refresh token is now dead.
      const winnerToken = winner?.cookies.find((c) => c.name === "tp_refresh")?.value ?? "";
      expect(winnerToken.length).toBeGreaterThan(0);
      const afterRace = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        headers: { origin: "https://testpulse.example.com" },
        cookies: { tp_refresh: winnerToken },
      });
      expect(afterRace.statusCode).toBe(401);
    });
  });
});
