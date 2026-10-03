import type { FastifyInstance } from "fastify";
import { AuthError } from "./auth.service";
import { RateLimitUnavailableError } from "./rate-limiter";

/**
 * Maps `AuthError` to the shared failure envelope inside an encapsulated auth plugin. Any other error is
 * rethrown so the application-wide handler (plugins/error-handler.ts) deals with it.
 */
export function registerAuthErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AuthError) {
      return reply.code(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    if (error instanceof RateLimitUnavailableError) {
      // Fail closed (security model §5): no limit store, no password auth.
      return reply.code(503).send({
        success: false,
        error: { code: "SERVICE_UNAVAILABLE", message: error.message },
      });
    }
    throw error;
  });
}
