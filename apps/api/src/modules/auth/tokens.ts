import crypto from "node:crypto";
import type { FastifyReply } from "fastify";

export const ACCESS_COOKIE_NAME = "tp_access";
export const REFRESH_COOKIE_NAME = "tp_refresh";

export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Generates a cryptographically secure random token (32 bytes = 64 hex chars).
 */
export function generateRandomToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Computes HMAC-SHA256 of a refresh token using the JWT_REFRESH_SECRET (ADR-005).
 */
export function hashRefreshToken(token: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

/**
 * Computes SHA-256 hash of a verification or password reset token.
 */
export function hashVerificationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface SetAuthCookiesOptions {
  reply: FastifyReply;
  accessToken: string;
  refreshToken: string;
  isProduction: boolean;
}

/**
 * Sets tp_access and tp_refresh HttpOnly cookies per ADR-005.
 */
export function setAuthCookies({ reply, accessToken, refreshToken, isProduction }: SetAuthCookiesOptions): void {
  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_EXPIRY_SECONDS,
  });

  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    path: "/api/v1/auth",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
  });
}

/**
 * Clears auth cookies on logout or session revocation.
 */
export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
}
