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

  it("[SC-KEY-006] [SC-SEC-006] censors all LOG_REDACT_PATHS fields across top-level, nested, and error header shapes", async () => {
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

    const secretMarkers = [
      "secret-top-password",
      "secret-top-hash",
      "secret-top-token",
      "secret-refresh-val",
      "secret-access-val",
      "secret-token-hash",
      "tp_live_top_apikey_val",
      "tp_live_plain_val",
      "secret-keyhash-val",
      "secret-generic-val",
      "secret-pkce-verifier",
      "secret-cookie-val",
      "secret-set-cookie-val",
      "secret-err-bearer",
      "secret-nested-refresh",
      "secret-deep-code-verifier",
    ];

    try {
      probe.log.info(
        {
          password: secretMarkers[0],
          passwordHash: secretMarkers[1],
          token: secretMarkers[2],
          refreshToken: secretMarkers[3],
          accessToken: secretMarkers[4],
          tokenHash: secretMarkers[5],
          apiKey: secretMarkers[6],
          plaintextKey: secretMarkers[7],
          keyHash: secretMarkers[8],
          secret: secretMarkers[9],
          codeVerifier: secretMarkers[10],
          req: { headers: { authorization: `Bearer ${secretMarkers[13]}`, cookie: secretMarkers[11] } },
          res: { headers: { "set-cookie": secretMarkers[12] } },
          payload: { refreshToken: secretMarkers[14] },
          err: {
            config: {
              headers: { authorization: `Bearer ${secretMarkers[13]}`, cookie: secretMarkers[11] },
              codeVerifier: secretMarkers[15],
            },
          },
        },
        "comprehensive secret redaction probe",
      );

      const output = lines.join("");
      expect(output).toContain("[REDACTED]");
      for (const marker of secretMarkers) {
        expect(output).not.toContain(marker);
      }
    } finally {
      await probe.close();
    }
  });
});
