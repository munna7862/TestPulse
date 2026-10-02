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

  it("fails fast with a readable error on invalid values", () => {
    expect(() => loadApiEnv({ PORT: "99999", WEB_ORIGIN: "not a url" })).toThrow(EnvValidationError);
  });
});
