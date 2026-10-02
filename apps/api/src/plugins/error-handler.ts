import type { ApiErrorCode, ApiFailure } from "@testpulse/shared";
import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
};

function failure(code: ApiErrorCode, message: string, requestId: string, details?: unknown): ApiFailure {
  return {
    success: false,
    error: details === undefined ? { code, message, requestId } : { code, message, details, requestId },
  };
}

/**
 * Maps every error to the shared envelope. Internal details (stack traces, DB messages) are logged,
 * never returned to clients (docs/security/security-model.md §6).
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((issue) => ({
        path: issue.instancePath,
        message: issue.message ?? "Invalid value",
      }));
      return reply.status(400).send(failure("VALIDATION_ERROR", "Request validation failed", request.id, details));
    }

    const status = typeof error.statusCode === "number" && error.statusCode >= 400 ? error.statusCode : 500;
    if (status >= 500) {
      request.log.error({ err: error }, "Unhandled error");
      return reply.status(500).send(failure("INTERNAL", "Something went wrong", request.id));
    }

    const code = STATUS_TO_CODE[status] ?? "INTERNAL";
    return reply.status(status).send(failure(code, error.message, request.id));
  });

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send(failure("NOT_FOUND", "Route not found", request.id)),
  );
}
