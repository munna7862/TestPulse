import type { ApiErrorCode } from "@testpulse/shared";

/**
 * Domain error carrying an HTTP status. The shared error handler maps the status to the envelope code, unless
 * `code` overrides it (e.g. 403 `PLAN_LIMIT_REACHED` instead of `FORBIDDEN`); `details` is returned as given.
 */
export class ApiError extends Error {
  constructor(
    readonly statusCode: 400 | 403 | 404 | 409,
    message: string,
    readonly code?: ApiErrorCode,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
