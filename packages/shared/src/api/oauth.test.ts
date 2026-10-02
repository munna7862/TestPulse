import { describe, expect, it } from "vitest";
import {
  DEFAULT_RETURN_TO,
  ListOAuthAccountsResponseSchema,
  OAuthErrorCodeSchema,
  OAuthProviderSchema,
  sanitizeReturnTo,
} from "./oauth";

describe("[SC-AUTH-021] sanitizeReturnTo", () => {
  it.each([
    ["/runs", "/runs"],
    ["/runs?status=failed", "/runs?status=failed"],
    ["/runs/abc-123", "/runs/abc-123"],
    ["/settings/profile", "/settings/profile"],
    ["/settings/profile?linked=github", "/settings/profile?linked=github"],
    ["/runs#fragment", "/runs"],
    ["/runs/../settings", "/settings"],
  ])("keeps allow-listed path %s", (input, expected) => {
    expect(sanitizeReturnTo(input)).toBe(expected);
  });

  it.each([
    "//evil.example",
    "//evil.example/runs",
    "https://evil.example",
    "http://evil.example/runs",
    "/\\evil.example",
    "\\\\evil.example",
    "/runs@evil.example",
    "/%2f%2fevil.example",
    "/runs\n/evil",
    "/runs\r\nSet-Cookie: x=1",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "runs",
    "/unknown",
    "/",
    "/runsfoo",
    "/api/v1/auth/logout-all",
    `/runs?${"a".repeat(600)}`,
    "",
  ])("falls back for hostile or unknown input %j", (input) => {
    expect(sanitizeReturnTo(input)).toBe(DEFAULT_RETURN_TO);
  });

  it("falls back for missing values and honors a custom fallback", () => {
    expect(sanitizeReturnTo(undefined)).toBe(DEFAULT_RETURN_TO);
    expect(sanitizeReturnTo(null)).toBe(DEFAULT_RETURN_TO);
    expect(sanitizeReturnTo("//evil.example", "/settings/profile")).toBe("/settings/profile");
  });
});

describe("OAuth shared schemas", () => {
  it("accepts only google and github providers", () => {
    expect(OAuthProviderSchema.safeParse("google").success).toBe(true);
    expect(OAuthProviderSchema.safeParse("github").success).toBe(true);
    expect(OAuthProviderSchema.safeParse("gitlab").success).toBe(false);
  });

  it("rejects unknown error codes", () => {
    expect(OAuthErrorCodeSchema.safeParse("EMAIL_CONFLICT").success).toBe(true);
    expect(OAuthErrorCodeSchema.safeParse("<script>").success).toBe(false);
  });

  it("does not allow provider account ids in the linked-accounts response", () => {
    const parsed = ListOAuthAccountsResponseSchema.parse({
      accounts: [{ id: "a1", provider: "github", createdAt: "2026-10-02T00:00:00.000Z", providerAccountId: "123" }],
      hasPassword: true,
    });
    expect(parsed.accounts[0]).not.toHaveProperty("providerAccountId");
  });
});
