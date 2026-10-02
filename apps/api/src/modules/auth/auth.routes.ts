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
import { clearAuthCookies, REFRESH_COOKIE_NAME, setAuthCookies } from "./tokens";

export interface AuthRoutesOptions {
  authService: AuthService;
  env: ApiEnv;
}

export function authRoutes({ authService, env }: AuthRoutesOptions): FastifyPluginAsyncZod {
  return async (app) => {
    const isProduction = env.NODE_ENV === "production";
    const middleware = createAuthMiddleware(authService.db, env);

    registerAuthErrorHandler(app);

    // 1. Register (SC-AUTH-001, SC-AUTH-002, SC-AUTH-003)
    app.post(
      "/register",
      {
        schema: {
          body: RegisterBodySchema,
          response: {
            202: apiSuccess(RegisterResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const result = await authService.register(request.body);
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
        schema: {
          body: ResendVerificationBodySchema,
          response: {
            202: apiSuccess(ResendVerificationResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const result = await authService.resendVerification(request.body.email);
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

    // 8. Forgot Password (SC-AUTH-011)
    app.post(
      "/password/forgot",
      {
        schema: {
          body: ForgotPasswordBodySchema,
          response: {
            202: apiSuccess(ForgotPasswordResponseSchema),
          },
        },
      },
      async (request, reply) => {
        const result = await authService.forgotPassword(request.body.email);
        return reply.code(202).send({
          success: true,
          data: result,
        });
      },
    );

    // 9. Reset Password (SC-AUTH-012)
    app.post(
      "/password/reset",
      {
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
