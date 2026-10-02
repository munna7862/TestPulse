import { OAuthErrorCodeSchema } from "@testpulse/shared";
import { describe, expect, it } from "vitest";
import { oauthErrorContent, oauthStartHref, parseOAuthErrorParams } from "./oauth";

describe("[SC-AUTH-026] OAuth web helpers", () => {
  it("links social buttons to the same-origin API start endpoint", () => {
    expect(oauthStartHref("google")).toBe("/api/v1/auth/oauth/google/start");
    expect(oauthStartHref("github")).toBe("/api/v1/auth/oauth/github/start");
  });

  it("has friendly copy for every error code the API can send", () => {
    for (const code of OAuthErrorCodeSchema.options) {
      const content = oauthErrorContent(code, "github");
      expect(content.title.length).toBeGreaterThan(5);
      expect(content.message.length).toBeGreaterThan(20);
      // Copy is for people: no raw codes or HTTP jargon.
      expect(`${content.title} ${content.message}`).not.toMatch(/[A-Z]+_[A-Z_]+|\b[45]\d\d\b/);
    }
  });

  it("names the provider where it helps, with a safe fallback", () => {
    expect(oauthErrorContent("EMAIL_CONFLICT", "github").message).toContain("GitHub");
    expect(oauthErrorContent("EMAIL_CONFLICT", "google").message).toContain("Google");
    expect(oauthErrorContent("PROVIDER_ERROR", undefined).title).toContain("your provider");
  });

  it("falls back to a generic message for unknown or missing codes", () => {
    expect(oauthErrorContent(undefined, undefined).title).toBe("We couldn't sign you in");
  });

  it("never trusts query values: unknown codes and providers are dropped", () => {
    expect(parseOAuthErrorParams({ code: "EMAIL_CONFLICT", provider: "github" })).toEqual({
      code: "EMAIL_CONFLICT",
      provider: "github",
    });
    expect(parseOAuthErrorParams({ code: ["ACCESS_DENIED", "x"], provider: ["google"] })).toEqual({
      code: "ACCESS_DENIED",
      provider: "google",
    });
    expect(parseOAuthErrorParams({ code: "<script>alert(1)</script>", provider: "gitlab" })).toEqual({
      code: undefined,
      provider: undefined,
    });
    expect(parseOAuthErrorParams({})).toEqual({ code: undefined, provider: undefined });
  });
});
