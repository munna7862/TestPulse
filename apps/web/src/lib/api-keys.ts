import {
  type ApiKey,
  ApiKeyNameSchema,
  ApiKeySchema,
  can,
  type CreatedApiKey,
  CreatedApiKeySchema,
  type CreateApiKeyBody,
  type OrgRole,
} from "@testpulse/shared";
import { z } from "zod";
import { ApiClientError, type ApiClientOptions, createApiClient } from "./api-client";
import { ApiError as AuthApiError } from "./auth-client";

export type KeyExpiryPreset = "never" | "30d" | "90d" | "365d";
export type ReporterFramework = "playwright" | "vitest";

const PRESET_DAYS: Readonly<Record<Exclude<KeyExpiryPreset, "never">, number>> = {
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

const API_KEY_ERROR_COPY: Readonly<Record<string, string>> = {
  FORBIDDEN: "Only organization owners and admins can manage project API keys.",
  NOT_FOUND: "This project or API key is no longer available.",
  VALIDATION_ERROR: "Enter a valid API key name (max 100 characters) and future expiration date.",
};

export interface ApiKeysClient {
  listApiKeys(projectId: string, signal?: AbortSignal): Promise<ApiKey[]>;
  createApiKey(projectId: string, body: CreateApiKeyBody): Promise<CreatedApiKey>;
  revokeApiKey(projectId: string, keyId: string): Promise<void>;
}

/** Returns true when `role` can create, list, or revoke project API keys (`apiKey.manage`). */
export function canManageApiKeys(role: OrgRole): boolean {
  return can(role, "apiKey.manage");
}

/** Converts a UI expiration preset into an ISO-8601 UTC timestamp, or undefined for no expiry. */
export function buildExpiresAtIso(preset: KeyExpiryPreset, now = new Date()): string | undefined {
  if (preset === "never") return undefined;
  const days = PRESET_DAYS[preset];
  return new Date(now.getTime() + days * 24 * 60 * 60_000).toISOString();
}

/** Validates key name client-side cleanly before calling `POST /api-keys`. */
export function validateApiKeyName(name: string): string | null {
  const parsed = ApiKeyNameSchema.safeParse(name);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? "Enter a valid key name.");
}

/** Maps API key errors to static safe copy without exposing backend error internals. */
export function formatApiKeyError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return API_KEY_ERROR_COPY[error.error.code] ?? fallback;
  if (error instanceof AuthApiError) return API_KEY_ERROR_COPY[error.code] ?? fallback;
  return fallback;
}

/**
 * Generates ready-to-paste `@testpulse/reporter` setup snippets for CI configuration files.
 * Always reads credentials from `process.env.TESTPULSE_API_KEY` so plaintext secrets are never committed.
 */
export function buildReporterSnippet(framework: ReporterFramework, projectName?: string): string {
  const safeName = projectName?.replace(/[\r\n\u2028\u2029]/g, " ").trim();
  const comment = safeName ? `// Configure @testpulse/reporter for ${safeName}\n` : "";
  if (framework === "playwright") {
    return `${comment}import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"],
    [
      "@testpulse/reporter/playwright",
      {
        apiKey: process.env.TESTPULSE_API_KEY,
      },
    ],
  ],
});`;
  }

  return `${comment}import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: [
      "default",
      [
        "@testpulse/reporter/vitest",
        {
          apiKey: process.env.TESTPULSE_API_KEY,
        },
      ],
    ],
  },
});`;
}

/** Typed API client for project API key management endpoints. */
export function createApiKeysClient(options?: ApiClientOptions): ApiKeysClient {
  const req = createApiClient(options);
  return {
    listApiKeys: (projectId, signal) =>
      req({
        path: `/api/v1/projects/${encodeURIComponent(projectId)}/api-keys`,
        schema: z.array(ApiKeySchema),
        ...(signal ? { signal } : {}),
      }),
    createApiKey: (projectId, body) =>
      req({
        method: "POST",
        path: `/api/v1/projects/${encodeURIComponent(projectId)}/api-keys`,
        body,
        schema: CreatedApiKeySchema,
      }),
    revokeApiKey: (projectId, keyId) =>
      req({
        method: "DELETE",
        path: `/api/v1/projects/${encodeURIComponent(projectId)}/api-keys/${encodeURIComponent(keyId)}`,
        schema: z.undefined(),
      }),
  };
}

export const apiKeysClient = createApiKeysClient();
