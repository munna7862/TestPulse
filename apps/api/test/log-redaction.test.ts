import { describe, expect, it } from "vitest";
import { redactRequestUrl } from "../src/log-redaction";

describe("log redaction", () => {
  it("[SC-AUTH-013] strips the query (authorization code and state) from OAuth URLs", () => {
    expect(redactRequestUrl("/api/v1/auth/oauth/github/callback?code=abc123&state=xyz")).toBe(
      "/api/v1/auth/oauth/github/callback?[REDACTED]",
    );
    expect(redactRequestUrl("/api/v1/auth/oauth/google/start?returnTo=%2Fruns")).toBe(
      "/api/v1/auth/oauth/google/start?[REDACTED]",
    );
  });

  it("leaves other URLs untouched", () => {
    expect(redactRequestUrl("/api/v1/auth/oauth/github/callback")).toBe("/api/v1/auth/oauth/github/callback");
    expect(redactRequestUrl("/healthz")).toBe("/healthz");
    expect(redactRequestUrl("/api/v1/projects?limit=10")).toBe("/api/v1/projects?limit=10");
  });
});
