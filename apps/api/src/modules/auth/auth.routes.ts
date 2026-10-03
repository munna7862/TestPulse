import {
  apiSuccess,
  AuthMeResponseSchema,
  ForgotPasswordBodySchema,
  ForgotPasswordResponseSchema,
  LoginBodySchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  RefreshResponseSchema,
  RegisterBodySchema,
  RegisterResponseSchema,
  ResendVerificationBodySchema,
  ResendVerificationResponseSchema,
  ResetPasswordBodySchema,
  ResetPasswordResponseSchema,
  VerifyEmailBodySchema,
  VerifyEmailResponseSchema,
} from "@testpulse/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { ApiEnv } from "../../env";
import { registerAuthErrorHandler } from "./auth-error-handler";
import { createAuthMiddleware } from "./auth.middleware";
import { AuthError, type AuthService } from "./auth.service";
import { byEmail, byIp, MemoryRateLimitStore, type RateLimitStore, rateLimitHook } from "./rate-limiter";
import { clearAuthCookies, REFRESH_COOKIE_NAME, setAuthCookies } from "./tokens";

export interface AuthRoutesOptions {
  authService: AuthService;
  env: ApiEnv;
  /** Shared counter store; Redis in deployed environments so limits hold across instances. */
  rateLimitStore?: RateLimitStore;
}

const MINUTE = 60_000;

/** Waits until at least `minMs` have passed since `startedAt`, so timing cannot reveal account existence. */
async function holdUntil(startedAt: number, minMs: number): Promise<void> {
  const remaining = minMs - (performance.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

export function authRoutes({
  authService,
  env,
  rateLimitStore = new MemoryRateLimitStore(),
}: AuthRoutesOptions): FastifyPluginAsyncZod {
  return async (app) => {
    const isProduction = env.NODE_ENV === "production";
    const middleware = createAuthMiddleware(authService.db, env);

    registerAuthErrorHandler(app);

    // Security model §5. Per-IP keys use request.ip, which trusts X-Forwarded-For only per TRUST_PROXY.
    const loginIp = { bucket: "login", max: env.AUTH_RATE_LIMIT_LOGIN_PER_MINUTE, windowMs: MINUTE, key: byIp };
    const loginEmail = {
      bucket: "login",
      max: env.AUTH_RATE_LIMIT_LOGIN_PER_EMAIL_PER_15_MIN,
      windowMs: 15 * MINUTE,
      key: byEmail,
    };
    const recoveryIp = {
      bucket: "recovery",
      max: env.AUTH_RATE_LIMIT_RECOVERY_PER_HOUR,
      windowMs: 60 * MINUTE,
      key: byIp,
    };
    const recoveryEmail = {
      bucket: "recovery",
      max: env.AUTH_RATE_LIMIT_RECOVERY_PER_EMAIL_PER_HOUR,
      windowMs: 60 * MINUTE,
      key: byEmail,
    };
    const limitLogin = rateLimitHook(rateLimitStore, [loginIp, loginEmail]);
    const limitRecovery = rateLimitHook(rateLimitStore, [recoveryIp, recoveryEmail]);
    const limitTokenRoutes = rateLimitHook(rateLimitStore, [recoveryIp]);

    // 1. Register (SC-AUTH-001, SC-AUTH-002, SC-AUTH-003, SC-AUTH-017)
    app.post(
      "/register",
      {
        preHandler: limitRecovery,
        schema: {
          body: RegisterBodySchema,
          response: {
            202: apiSuccess(RegisterResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const startedAt = performance.now();
        const result = await authService.register(request.body);
        await holdUntil(startedAt, env.AUTH_GENERIC_RESPONSE_MIN_MS);
        return reply.code(202).send({
          success: true,
          data: result,
        });
      },
    );

    // 2. Verify Email (SC-AUTH-004, SC-AUTH-005)
    app.post(
      "/verify-email",
      {
        preHandler: limitTokenRoutes,
        schema: {
          body: VerifyEmailBodySchema,
          response: {
            200: apiSuccess(VerifyEmailResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const result = await authService.verifyEmail(request.body.token);
        return reply.code(200).send({
          success: true,
          data: result,
        });
      },
    );

    // 3. Resend Verification
    app.post(
      "/resend-verification",
      {
        preHandler: limitRecovery,
        schema: {
          body: ResendVerificationBodySchema,
          response: {
            202: apiSuccess(ResendVerificationResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const startedAt = performance.now();
        const result = await authService.resendVerification(request.body.email);
        await holdUntil(startedAt, env.AUTH_GENERIC_RESPONSE_MIN_MS);
        return reply.code(202).send({
          success: true,
          data: result,
        });
      },
    );

    // 4. Login (SC-AUTH-006, SC-AUTH-007, SC-AUTH-017)
    app.post(
      "/login",
      {
        preHandler: limitLogin,
        schema: {
          body: LoginBodySchema,
          response: {
            200: apiSuccess(LoginResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const { user, accessToken, refreshToken } = await authService.login({
          email: request.body.email,
          password: request.body.password,
          userAgent: request.headers["user-agent"],
        });

        setAuthCookies({
          reply,
          accessToken,
          refreshToken,
          isProduction,
        });

        return reply.code(200).send({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              avatarUrl: user.avatarUrl,
              emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
              createdAt: user.createdAt.toISOString(),
            },
          },
        });
      },
    );

    // 5. Refresh (SC-AUTH-008, SC-AUTH-009, SC-AUTH-018)
    app.post(
      "/refresh",
      {
        preHandler: [middleware.validateCsrf],
        schema: {
          response: {
            200: apiSuccess(RefreshResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
        if (!refreshToken) {
          throw new AuthError(401, "UNAUTHENTICATED", "Missing refresh token cookie.");
        }

        const { accessToken, refreshToken: newRefreshToken } = await authService.refreshSession({
          refreshToken,
          userAgent: request.headers["user-agent"],
        });

        setAuthCookies({
          reply,
          accessToken,
          refreshToken: newRefreshToken,
          isProduction,
        });

        return reply.code(200).send({
          success: true,
          data: { refreshed: true },
        });
      },
    );

    // 6. Logout (SC-AUTH-010, SC-AUTH-018)
    app.post(
      "/logout",
      {
        preHandler: [middleware.validateCsrf, middleware.authenticateUser],
        schema: {
          response: {
            200: apiSuccess(LogoutResponseSchema),
          },
        },
      },
      async (request, reply) => {
        if (request.authSessionId) {
          await authService.logout(request.authSessionId);
        }
        clearAuthCookies(reply);
        return reply.code(200).send({
          success: true,
          data: { loggedOut: true },
        });
      },
    );

    // 7. Logout-all (SC-AUTH-010, SC-AUTH-018)
    app.post(
      "/logout-all",
      {
        preHandler: [middleware.validateCsrf, middleware.authenticateUser],
        schema: {
          response: {
            200: apiSuccess(LogoutResponseSchema),
          },
        },
      },
      async (request, reply) => {
        if (request.authUser) {
          await authService.logoutAll(request.authUser.id);
        }
        clearAuthCookies(reply);
        return reply.code(200).send({
          success: true,
          data: { loggedOut: true },
        });
      },
    );

    // 8. Forgot Password (SC-AUTH-011, SC-AUTH-017)
    app.post(
      "/password/forgot",
      {
        preHandler: limitRecovery,
        schema: {
          body: ForgotPasswordBodySchema,
          response: {
            202: apiSuccess(ForgotPasswordResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const startedAt = performance.now();
        const result = await authService.forgotPassword(request.body.email);
        await holdUntil(startedAt, env.AUTH_GENERIC_RESPONSE_MIN_MS);
        return reply.code(202).send({
          success: true,
          data: result,
        });
      },
    );

    // 9. Reset Password (SC-AUTH-012, SC-AUTH-017)
    app.post(
      "/password/reset",
      {
        preHandler: limitTokenRoutes,
        schema: {
          body: ResetPasswordBodySchema,
          response: {
            200: apiSuccess(ResetPasswordResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const result = await authService.resetPassword(request.body);
        clearAuthCookies(reply);
        return reply.code(200).send({
          success: true,
          data: result,
        });
      },
    );

    // 10. Me (Current authenticated user profile)
    app.get(
      "/me",
      {
        preHandler: [middleware.authenticateUser],
        schema: {
          response: {
            200: apiSuccess(AuthMeResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const user = request.authUser;
        if (!user) {
          throw new AuthError(401, "UNAUTHENTICATED", "Authentication required.");
        }
        return reply.code(200).send({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              avatarUrl: user.avatarUrl,
              emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
              createdAt: user.createdAt.toISOString(),
            },
          },
        });
      },
    );

    // 11. Protected action requiring verified email (for SC-AUTH-019 test guard)
    app.post(
      "/restricted-action",
      {
        preHandler: [middleware.validateCsrf, middleware.authenticateUser, middleware.requireVerifiedEmail],
        schema: {
          response: {
            200: apiSuccess(z.object({ allowed: z.boolean() })),
          },
        },
      },
      async (_request, reply) => {
        return reply.code(200).send({
          success: true,
          data: { allowed: true },
        });
      },
    );
  };
}
