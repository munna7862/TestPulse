import type { PrismaClient, User } from "@testpulse/db";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ApiEnv } from "../../env";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "./tokens";

export interface FastifyAuthContext {
  user: User;
  sessionId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: User;
    authSessionId?: string;
  }
}

export function createAuthMiddleware(db: PrismaClient, env: ApiEnv) {
  /**
   * PreHandler checking Origin header on cookie-authenticated mutations (SC-AUTH-018; ADR-005 §5).
   */
  async function validateCsrf(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
    if (!isMutation) return;

    // Only apply CSRF check if request carries session cookies
    const hasAuthCookie = Boolean(request.cookies[ACCESS_COOKIE_NAME] || request.cookies[REFRESH_COOKIE_NAME]);
    if (!hasAuthCookie) return;

    const origin = request.headers.origin;
    if (!origin) {
      return reply.code(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Cross-site request forgery check failed: missing Origin header.",
        },
      });
    }

    const allowedOrigins = new Set([
      env.WEB_ORIGIN.replace(/\/$/, ""),
      `http://${env.HOST}:${env.PORT}`,
      `http://localhost:${env.PORT}`,
      `http://127.0.0.1:${env.PORT}`,
    ]);

    // Also allow origin matching Host header
    if (request.headers.host) {
      allowedOrigins.add(`http://${request.headers.host}`);
      allowedOrigins.add(`https://${request.headers.host}`);
    }

    const cleanOrigin = origin.replace(/\/$/, "");
    if (!allowedOrigins.has(cleanOrigin)) {
      return reply.code(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Cross-site request forgery check failed: origin is not permitted.",
        },
      });
    }
  }

  /**
   * PreHandler authenticating user via tp_access cookie or Authorization Bearer header.
   */
  async function authenticateUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    let token: string | undefined = request.cookies[ACCESS_COOKIE_NAME];

    if (!token && request.headers.authorization?.startsWith("Bearer ")) {
      token = request.headers.authorization.slice(7);
    }

    if (!token) {
      return reply.code(401).send({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
        },
      });
    }

    try {
      const decoded = await request.jwtVerify<{ sub: string; sid: string }>({ onlyCookie: false });
      const { sid: sessionId } = decoded;

      // Verify that the session is still active in the database
      const session = await db.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });

      if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now()) {
        return reply.code(401).send({
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Session is invalid or expired.",
          },
        });
      }

      if (session.user.deletedAt !== null) {
        return reply.code(401).send({
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "User account is inactive.",
          },
        });
      }

      request.authUser = session.user;
      request.authSessionId = session.id;
    } catch {
      return reply.code(401).send({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Invalid or expired access token.",
        },
      });
    }
  }

  /**
   * Guard requiring verified email (SC-AUTH-019; ADR-005 §7).
   */
  async function requireVerifiedEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.authUser) {
      return reply.code(401).send({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required.",
        },
      });
    }

    if (!request.authUser.emailVerifiedAt) {
      return reply.code(403).send({
        success: false,
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Email verification is required before performing this action.",
        },
      });
    }
  }

  return {
    validateCsrf,
    authenticateUser,
    requireVerifiedEmail,
  };
}
