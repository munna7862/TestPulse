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
          headers: {
            "x-forwarded-for": clientIp,
          },
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
          url: "/api/v1/auth/forgot-password",
          headers: {
            "x-forwarded-for": clientIp,
          },
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

      const statuses = [res1.statusCode, res2.statusCode];

      // CRITICAL: Both requests CANNOT succeed (200, 200). That was defect G6!
      // At most one can succeed (200), and the other must be rejected (401).
      // Or if token reuse is detected due to race, both terminate.
      const successCount = statuses.filter((s) => s === 200).length;
      expect(successCount).toBeLessThanOrEqual(1);

      const has401 = statuses.includes(401);
      expect(has401).toBe(true);

      // Verify that if family reuse was triggered, subsequent refresh is blocked
      if (res1.statusCode === 401 || res2.statusCode === 401) {
        const errorJson: unknown = res1.statusCode === 401 ? res1.json() : res2.json();
        const parsed = ApiFailureSchema.safeParse(errorJson);
        expect(parsed.success).toBe(true);
      }
    });
  });
});
