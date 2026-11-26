import { z } from "zod";
import { apiSuccess } from "./envelope";
import { hasNoControlChars } from "./orgs";

export const API_KEY_LIVE_PREFIX = "tp_live_";

/** API key IDs are UUID v7 strings matching project/org identifiers. */
export const ApiKeyIdSchema = z.uuid();

export const ApiKeyParamsSchema = z.object({
  projectId: z.string(),
  keyId: z.string(),
});
export type ApiKeyParams = z.infer<typeof ApiKeyParamsSchema>;

export const ApiKeyNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must not exceed 100 characters")
  .refine(hasNoControlChars, { message: "Name must not contain control characters" });

export const ApiKeyStatusSchema = z.enum(["ACTIVE", "EXPIRED", "REVOKED"]);
export type ApiKeyStatus = z.infer<typeof ApiKeyStatusSchema>;

export const CreateApiKeyBodySchema = z.strictObject({
  name: ApiKeyNameSchema,
  expiresAt: z.iso.datetime().optional(),
});
export type CreateApiKeyBody = z.infer<typeof CreateApiKeyBodySchema>;

export const ApiKeySchema = z.object({
  id: z.string(),
  orgId: z.string(),
  projectId: z.string(),
  name: z.string(),
  prefix: z.string(),
  createdById: z.string(),
  createdByName: z.string(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  status: ApiKeyStatusSchema,
  createdAt: z.string(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

export const CreatedApiKeySchema = ApiKeySchema.extend({
  plaintextKey: z.string(),
});
export type CreatedApiKey = z.infer<typeof CreatedApiKeySchema>;

export const ApiKeyResponseSchema = apiSuccess(ApiKeySchema);
export const CreatedApiKeyResponseSchema = apiSuccess(CreatedApiKeySchema);
export const ApiKeyListResponseSchema = apiSuccess(z.array(ApiKeySchema));
