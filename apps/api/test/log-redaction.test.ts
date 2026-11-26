import { Writable } from "node:stream";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { LOG_REDACT_PATHS, redactRequestUrl } from "../src/log-redaction";

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

  it("[SC-KEY-006] censors plaintextKey and Authorization headers through Pino LOG_REDACT_PATHS", async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(String(chunk));
        callback();
      },
    });
    const probe = Fastify({
      logger: { stream, redact: { paths: LOG_REDACT_PATHS, censor: "[REDACTED]" } },
    });
    await probe.ready();

    try {
      probe.log.info(
        {
          req: { headers: { authorization: "Bearer tp_live_secretvalue123" } },
          body: { plaintextKey: "tp_live_secretvalue123" },
        },
        "api key probe",
      );
      const output = lines.join("");
      expect(output).toContain("[REDACTED]");
      expect(output).not.toContain("tp_live_secretvalue123");
    } finally {
      await probe.close();
    }
  });
});
