import { describe, expect, it } from "vitest";
import {
  API_KEY_LIVE_PREFIX,
  ApiKeyIdSchema,
  ApiKeyListResponseSchema,
  ApiKeyNameSchema,
  ApiKeyParamsSchema,
  ApiKeyResponseSchema,
  ApiKeySchema,
  CreatedApiKeyResponseSchema,
  CreateApiKeyBodySchema,
} from "./api-keys";

describe("shared API key schemas", () => {
  it("[SC-KEY-001] accepts valid key names and optional ISO expiresAt, rejecting control chars and unknown keys", () => {
    expect(API_KEY_LIVE_PREFIX).toBe("tp_live_");
    expect(ApiKeyNameSchema.parse("  GitHub Actions CI  ")).toBe("GitHub Actions CI");

    expect(CreateApiKeyBodySchema.parse({ name: "CI Reporter" })).toEqual({ name: "CI Reporter" });
    expect(CreateApiKeyBodySchema.parse({ name: "Nightly", expiresAt: "2027-01-01T00:00:00.000Z" })).toEqual({
      name: "Nightly",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    expect(() => CreateApiKeyBodySchema.parse({})).toThrow();
    expect(() => CreateApiKeyBodySchema.parse({ name: "   " })).toThrow();
    expect(() => CreateApiKeyBodySchema.parse({ name: "x".repeat(101) })).toThrow();
    expect(() => CreateApiKeyBodySchema.parse({ name: "bad\u0000name" })).toThrow();
    expect(() => CreateApiKeyBodySchema.parse({ name: "bad\nname" })).toThrow();
    expect(() => CreateApiKeyBodySchema.parse({ name: "CI", expiresAt: "not-a-date" })).toThrow();
    expect(() => CreateApiKeyBodySchema.parse({ name: "CI", extra: true })).toThrow();

    expect(ApiKeyIdSchema.parse("01950000-0000-7000-8000-000000000010")).toBe("01950000-0000-7000-8000-000000000010");
    expect(() => ApiKeyIdSchema.parse("not-a-uuid")).toThrow();
    expect(ApiKeyParamsSchema.parse({ projectId: "proj-1", keyId: "key-1" })).toEqual({
      projectId: "proj-1",
      keyId: "key-1",
    });
    expect(() => ApiKeyParamsSchema.parse({ projectId: "proj-1" })).toThrow();
  });

  it("[SC-KEY-003] validates metadata list items without exposing plaintext keys or hashes", () => {
    const sample = {
      id: "01950000-0000-7000-8000-000000000010",
      orgId: "01950000-0000-7000-8000-000000000001",
      projectId: "01950000-0000-7000-8000-000000000002",
      name: "GitHub Main",
      prefix: "aB3dE5fG",
      createdById: "01950000-0000-7000-8000-000000000003",
      createdByName: "Ada Lovelace",
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      status: "ACTIVE" as const,
      createdAt: "2026-11-26T00:00:00.000Z",
    };

    expect(ApiKeySchema.parse(sample)).toEqual(sample);
    expect(ApiKeyResponseSchema.parse({ success: true, data: sample }).data).toEqual(sample);
    expect(ApiKeyListResponseSchema.parse({ success: true, data: [sample] }).data).toHaveLength(1);
    const dummyPlaintext = `${API_KEY_LIVE_PREFIX}${"a".repeat(20)}`;
    expect(
      CreatedApiKeyResponseSchema.parse({
        success: true,
        data: { ...sample, plaintextKey: dummyPlaintext },
      }).data.plaintextKey,
    ).toBe(dummyPlaintext);
  });
});
