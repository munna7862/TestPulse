import { EnvValidationError } from "@testpulse/shared";
import { describe, expect, it } from "vitest";
import { loadApiEnv } from "../src/env";

describe("API environment", () => {
  it("applies free-profile defaults", () => {
    const env = loadApiEnv({});
    expect(env.DEPLOYMENT_PROFILE).toBe("free");
    expect(env.RUN_WORKERS_IN_PROCESS).toBe(true);
    expect(env.PORT).toBe(4000);
  });

  it("[SC-OPS-008] reports the Render commit when GIT_COMMIT_SHA is not set", () => {
    expect(loadApiEnv({ RENDER_GIT_COMMIT: "abc123" }).GIT_COMMIT_SHA).toBe("abc123");
    expect(loadApiEnv({ RENDER_GIT_COMMIT: "abc123", GIT_COMMIT_SHA: "explicit" }).GIT_COMMIT_SHA).toBe("explicit");
  });

  it("[SC-AUTH-017] rejects TRUST_PROXY hop counts above 5, which would trust client-written entries", () => {
    expect(loadApiEnv({ TRUST_PROXY: "2" }).TRUST_PROXY).toBe(2);
    expect(() => loadApiEnv({ TRUST_PROXY: "99" })).toThrow(EnvValidationError);
  });

  it("fails fast with a readable error on invalid values", () => {
    expect(() => loadApiEnv({ PORT: "99999" })).toThrow(EnvValidationError);
    expect(() => loadApiEnv({ WEB_ORIGIN: "not a url" })).toThrow(EnvValidationError);
    expect(() => loadApiEnv({ APP_URL: "javascript:alert(1)" })).toThrow(EnvValidationError);
  });

  it("rejects missing, short, whitespace, identical or dev-default JWT secrets in production", () => {
    expect(() => loadApiEnv({ NODE_ENV: "production" })).toThrow(EnvValidationError);
    expect(() =>
      loadApiEnv({
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "short-secret-16ch",
        JWT_REFRESH_SECRET: "b".repeat(32),
      }),
    ).toThrow(EnvValidationError);
    expect(() =>
      loadApiEnv({
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "a".repeat(32),
        JWT_REFRESH_SECRET: "short-secret-16ch",
      }),
    ).toThrow(EnvValidationError);
    expect(() =>
      loadApiEnv({
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "dev-jwt-access-secret-32-chars-long-min!!",
        JWT_REFRESH_SECRET: "b".repeat(32),
      }),
    ).toThrow(EnvValidationError);
    expect(() =>
      loadApiEnv({
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "a".repeat(32),
        JWT_REFRESH_SECRET: "dev-jwt-refresh-secret-32-chars-long-min!!",
      }),
    ).toThrow(EnvValidationError);
    expect(() =>
      loadApiEnv({
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: " ".repeat(32),
        JWT_REFRESH_SECRET: " ".repeat(32),
      }),
    ).toThrow(EnvValidationError);
    expect(() =>
      loadApiEnv({
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: " dev-jwt-access-secret-32-chars-long-min!! ",
        JWT_REFRESH_SECRET: "b".repeat(32),
      }),
    ).toThrow(EnvValidationError);
    expect(() =>
      loadApiEnv({
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "a".repeat(32),
        JWT_REFRESH_SECRET: "a".repeat(32),
      }),
    ).toThrow(EnvValidationError);
  });

  it("defaults APP_URL to WEB_ORIGIN when unset or blank, strips trailing slashes and honors explicit APP_URL", () => {
    const validSecrets = {
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
    };
    expect(loadApiEnv({ ...validSecrets, WEB_ORIGIN: "https://staging.example.com/" }).APP_URL).toBe(
      "https://staging.example.com",
    );
    expect(loadApiEnv({ ...validSecrets, WEB_ORIGIN: "https://staging.example.com", APP_URL: "   " }).APP_URL).toBe(
      "https://staging.example.com",
    );
    expect(
      loadApiEnv({ ...validSecrets, WEB_ORIGIN: "https://staging.example.com", APP_URL: "https://app.example.com/" })
        .APP_URL,
    ).toBe("https://app.example.com");
  });

  it("disables the auth timing floor by default in test mode only", () => {
    expect(loadApiEnv({ NODE_ENV: "test" }).AUTH_GENERIC_RESPONSE_MIN_MS).toBe(0);
    expect(loadApiEnv({ NODE_ENV: "development" }).AUTH_GENERIC_RESPONSE_MIN_MS).toBe(250);
  });
});
