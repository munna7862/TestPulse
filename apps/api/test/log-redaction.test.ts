import { Writable } from "node:stream";
import Fastify from "fastify";
import pino from "pino";
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

  it("[SC-KEY-006] [SC-SEC-006] censors every LOG_REDACT_PATHS field structurally across top-level, nested, header, and error shapes", async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(String(chunk));
        callback();
      },
    });
    const rawLogger = pino({ redact: { paths: LOG_REDACT_PATHS, censor: "[REDACTED]" } }, stream);
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
      "secret-req-bearer",
      "secret-req-cookie",
      "secret-set-cookie",
      "secret-top-headers-bearer",
      "secret-top-headers-cookie",
      "secret-nested-refresh",
      "secret-nested-err-bearer",
      "secret-nested-err-cookie",
      "secret-deep-bearer",
      "secret-deep-cookie",
      "secret-deep-code-verifier",
    ];

    try {
      const payload = {
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
        req: { headers: { authorization: `Bearer ${secretMarkers[11]}`, cookie: secretMarkers[12] } },
        res: { headers: { "set-cookie": secretMarkers[13] } },
        headers: { authorization: `Bearer ${secretMarkers[14]}`, cookie: secretMarkers[15] },
        payload: { refreshToken: secretMarkers[16] },
        err: {
          headers: { authorization: `Bearer ${secretMarkers[17]}`, cookie: secretMarkers[18] },
          config: {
            headers: { authorization: `Bearer ${secretMarkers[19]}`, cookie: secretMarkers[20] },
            codeVerifier: secretMarkers[21],
          },
        },
      };

      rawLogger.info(payload, "pino redaction probe");
      probe.log.info(payload, "fastify redaction probe");

      const output = lines.join("");
      for (const marker of secretMarkers) {
        expect(output).not.toContain(marker);
      }

      const parsedRaw = JSON.parse(lines[0] ?? "{}") as {
        password?: unknown;
        passwordHash?: unknown;
        token?: unknown;
        refreshToken?: unknown;
        accessToken?: unknown;
        tokenHash?: unknown;
        apiKey?: unknown;
        plaintextKey?: unknown;
        keyHash?: unknown;
        secret?: unknown;
        codeVerifier?: unknown;
        req?: { headers?: { authorization?: unknown; cookie?: unknown } };
        res?: { headers?: { "set-cookie"?: unknown } };
        headers?: { authorization?: unknown; cookie?: unknown };
        payload?: { refreshToken?: unknown };
        err?: {
          headers?: { authorization?: unknown; cookie?: unknown };
          config?: { headers?: { authorization?: unknown; cookie?: unknown }; codeVerifier?: unknown };
        };
      };

      expect(parsedRaw.password).toBe("[REDACTED]");
      expect(parsedRaw.passwordHash).toBe("[REDACTED]");
      expect(parsedRaw.token).toBe("[REDACTED]");
      expect(parsedRaw.refreshToken).toBe("[REDACTED]");
      expect(parsedRaw.accessToken).toBe("[REDACTED]");
      expect(parsedRaw.tokenHash).toBe("[REDACTED]");
      expect(parsedRaw.apiKey).toBe("[REDACTED]");
      expect(parsedRaw.plaintextKey).toBe("[REDACTED]");
      expect(parsedRaw.keyHash).toBe("[REDACTED]");
      expect(parsedRaw.secret).toBe("[REDACTED]");
      expect(parsedRaw.codeVerifier).toBe("[REDACTED]");
      expect(parsedRaw.req?.headers?.authorization).toBe("[REDACTED]");
      expect(parsedRaw.req?.headers?.cookie).toBe("[REDACTED]");
      expect(parsedRaw.res?.headers?.["set-cookie"]).toBe("[REDACTED]");
      expect(parsedRaw.headers?.authorization).toBe("[REDACTED]");
      expect(parsedRaw.headers?.cookie).toBe("[REDACTED]");
      expect(parsedRaw.payload?.refreshToken).toBe("[REDACTED]");
      expect(parsedRaw.err?.headers?.authorization).toBe("[REDACTED]");
      expect(parsedRaw.err?.headers?.cookie).toBe("[REDACTED]");
      expect(parsedRaw.err?.config?.headers?.authorization).toBe("[REDACTED]");
      expect(parsedRaw.err?.config?.headers?.cookie).toBe("[REDACTED]");
      expect(parsedRaw.err?.config?.codeVerifier).toBe("[REDACTED]");

      const parsedFastify = JSON.parse(lines[1] ?? "{}") as typeof parsedRaw;
      expect(parsedFastify.headers?.authorization).toBe("[REDACTED]");
      expect(parsedFastify.err?.config?.codeVerifier).toBe("[REDACTED]");
    } finally {
      await probe.close();
    }
  });
});
