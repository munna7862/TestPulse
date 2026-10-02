import { z } from "zod";

/**
 * Shared error codes for every API response (docs/api/rest-api.md §1, docs/api/ingestion.md §6).
 * Adding a code is non-breaking; renaming or removing one is breaking.
 */
export const ApiErrorCode = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PLAN_LIMIT_REACHED",
  "RATE_LIMITED",
  "QUOTA_EXCEEDED",
  "PAYLOAD_TOO_LARGE",
  "INVALID_API_KEY",
  "RUN_NOT_FOUND",
  "RUN_COMPLETED",
  "SHARD_MISMATCH",
  "EMAIL_NOT_VERIFIED",
  "SERVICE_UNAVAILABLE",
  "INTERNAL",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

export const ApiErrorSchema = z.object({
  code: ApiErrorCode,
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiMetaSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().int().positive().optional(),
});
export type ApiMeta = z.infer<typeof ApiMetaSchema>;

export const ApiFailureSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});
export type ApiFailure = z.infer<typeof ApiFailureSchema>;

/**
 * Success envelope with an unparsed payload. Clients validate the envelope with this schema and the
 * payload with their own schema (avoids generic type narrowing limits of discriminated unions).
 */
export const ApiSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: ApiMetaSchema.optional(),
});

/** Builds the success envelope schema `{ success: true, data, meta? }` for a payload schema. */
export function apiSuccess<T extends z.ZodType>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    meta: ApiMetaSchema.optional(),
  });
}

/** Builds the union `success | failure` used by API clients to parse any response. */
export function apiResponse<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("success", [apiSuccess(data), ApiFailureSchema]);
}
