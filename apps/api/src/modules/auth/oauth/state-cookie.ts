import crypto from "node:crypto";
import { OAuthProviderSchema } from "@testpulse/shared";
import type { FastifyReply } from "fastify";
import { z } from "zod";

export const OAUTH_STATE_COOKIE_NAME = "tp_oauth";
export const OAUTH_COOKIE_PATH = "/api/v1/auth/oauth";
/** The flow must complete within this window (security model §2.3: short-lived). */
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const MAX_CLOCK_SKEW_SECONDS = 60;

/** Everything the callback must be able to trust about the flow this browser started. */
export const OAuthStatePayloadSchema = z.object({
  /** Random `state` value echoed back by the provider. */
  s: z.string().min(16).max(128),
  /** PKCE code verifier. */
  v: z.string().min(43).max(128),
  /** Provider this flow was started for. */
  p: OAuthProviderSchema,
  /** Allow-listed post-login path. */
  r: z.string().max(512),
  /** Present only when the flow links a provider account to the signed-in user with this id. */
  l: z.string().max(64).optional(),
  /** Issued-at, epoch seconds. */
  iat: z.number().int(),
});
export type OAuthStatePayload = z.infer<typeof OAuthStatePayloadSchema>;

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

/**
 * Seals and opens the short-lived OAuth state cookie. The value is `base64url(json).base64url(hmac)`;
 * the HMAC key is derived (HKDF) from the access-token secret with a dedicated label so it can never
 * validate — or be confused with — a JWT signature. The contents are integrity-protected, not encrypted:
 * nothing in them is secret from the browser that owns the cookie.
 */
export function createStateCodec(secret: string) {
  const key = Buffer.from(crypto.hkdfSync("sha256", secret, "", "testpulse:oauth-state:v1", 32));

  function sign(encodedPayload: string): Buffer {
    return crypto.createHmac("sha256", key).update(encodedPayload).digest();
  }

  return {
    seal(payload: Omit<OAuthStatePayload, "iat">, nowMs: number = Date.now()): string {
      const full: OAuthStatePayload = { ...payload, iat: Math.floor(nowMs / 1000) };
      const encoded = base64url(Buffer.from(JSON.stringify(full), "utf8"));
      return `${encoded}.${base64url(sign(encoded))}`;
    },

    /** Returns the payload, or `null` when the value is missing, tampered with, malformed, or expired. */
    open(value: string | undefined, nowMs: number = Date.now()): OAuthStatePayload | null {
      if (!value || value.length > 2048) return null;
      const parts = value.split(".");
      if (parts.length !== 2) return null;
      const [encoded, signature] = parts as [string, string];

      const provided = Buffer.from(signature, "base64url");
      const expected = sign(encoded);
      if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;

      let json: unknown;
      try {
        json = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
      } catch {
        return null;
      }
      const parsed = OAuthStatePayloadSchema.safeParse(json);
      if (!parsed.success) return null;

      const ageSeconds = Math.floor(nowMs / 1000) - parsed.data.iat;
      if (ageSeconds > OAUTH_STATE_TTL_SECONDS || ageSeconds < -MAX_CLOCK_SKEW_SECONDS) return null;
      return parsed.data;
    },
  };
}
export type StateCodec = ReturnType<typeof createStateCodec>;

/** Constant-time string comparison that tolerates different lengths. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function setStateCookie(reply: FastifyReply, sealed: string, isProduction: boolean): void {
  reply.setCookie(OAUTH_STATE_COOKIE_NAME, sealed, {
    path: OAUTH_COOKIE_PATH,
    httpOnly: true,
    secure: isProduction,
    // Lax: the provider redirects back with a top-level GET navigation, which still carries the cookie.
    sameSite: "lax",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
}

export function clearStateCookie(reply: FastifyReply): void {
  reply.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: OAUTH_COOKIE_PATH });
}
