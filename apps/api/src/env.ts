import { booleanString, DeploymentProfile, parseEnv } from "@testpulse/shared";
import { z } from "zod";

/**
 * API environment (docs/ops/environment.md). Server-only: never import this from shared code.
 * Variables for later sprints (database, Redis, auth, mail) are added by those sprints.
 */
/** Blank values (e.g. `GOOGLE_CLIENT_ID=` in a .env file) count as "not configured". */
const optionalSecret = z
  .string()
  .optional()
  .transform((value) => (value === undefined || value.trim() === "" ? undefined : value.trim()));

export const ApiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEPLOYMENT_PROFILE: DeploymentProfile.default("free"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  RUN_WORKERS_IN_PROCESS: booleanString.default(true),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  APP_URL: z.string().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(16).default("dev-jwt-access-secret-32-chars-long-min!!"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev-jwt-refresh-secret-32-chars-long-min!!"),
  /**
   * Which proxies may set X-Forwarded-For (security model §5): `false`, a hop count (`1` = trust only the proxy
   * that connects to us, e.g. Render's load balancer), or a comma-separated list of trusted proxy IPs/CIDRs.
   * `true` is rejected: it trusts every hop, so clients could spoof their IP and dodge per-IP rate limits.
   */
  TRUST_PROXY: z
    .string()
    .default("false")
    .transform((value, ctx): false | number | string[] => {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === "false" || trimmed === "0" || trimmed === "") return false;
      if (trimmed === "true") {
        ctx.addIssue({
          code: "custom",
          message:
            "TRUST_PROXY=true trusts client-supplied X-Forwarded-For. Use a hop count (e.g. 1) or trusted proxy CIDRs.",
        });
        return z.NEVER;
      }
      if (/^\d+$/.test(trimmed)) {
        const hops = Number(trimmed);
        if (hops > 5) {
          ctx.addIssue({
            code: "custom",
            message: "TRUST_PROXY hop count must be 0-5; a larger count trusts client-written entries.",
          });
          return z.NEVER;
        }
        return hops;
      }
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  GIT_COMMIT_SHA: z.string().optional(),
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  GITHUB_CLIENT_ID: optionalSecret,
  GITHUB_CLIENT_SECRET: optionalSecret,
  /** Origin that providers redirect back to. Defaults to WEB_ORIGIN (same-origin `/api` proxy, first-party cookies). */
  OAUTH_REDIRECT_BASE_URL: optionalSecret,
  /** Upper bound for each outbound provider call (token exchange, profile). */
  OAUTH_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(10_000),
  /** Per-IP limit for OAuth start/callback (security model §5). */
  OAUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).default(30),
  /** Password login attempts per IP per minute (security model §5). */
  AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).default(10),
  /** Password login attempts per account (email) per 15 minutes, from any IP (security model §5). */
  AUTH_RATE_LIMIT_LOGIN_PER_EMAIL_PER_15_MIN: z.coerce.number().int().min(1).max(10_000).default(5),
  /** Register, resend-verification, forgot/reset password and verify-email requests per IP per hour. */
  AUTH_RATE_LIMIT_RECOVERY_PER_HOUR: z.coerce.number().int().min(1).max(10_000).default(20),
  /** Register, resend-verification and forgot-password requests per email per hour, from any IP. */
  AUTH_RATE_LIMIT_RECOVERY_PER_EMAIL_PER_HOUR: z.coerce.number().int().min(1).max(10_000).default(5),
  /**
   * Generic auth responses (register, resend-verification, forgot-password) never return sooner than this,
   * so response time cannot reveal whether an account exists (ADR-005 §9). 0 disables the floor.
   */
  AUTH_GENERIC_RESPONSE_MIN_MS: z.coerce.number().int().min(0).max(10_000).default(250),
});
export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function loadApiEnv(source: Record<string, string | undefined> = process.env): ApiEnv {
  // Render exposes the deployed commit as RENDER_GIT_COMMIT; the staging smoke check compares it via /health.
  return parseEnv(ApiEnvSchema, {
    ...source,
    GIT_COMMIT_SHA: source.GIT_COMMIT_SHA ?? source.RENDER_GIT_COMMIT,
    // Keep unit and integration suites fast; tests that check the floor set it explicitly.
    AUTH_GENERIC_RESPONSE_MIN_MS: source.AUTH_GENERIC_RESPONSE_MIN_MS ?? (source.NODE_ENV === "test" ? "0" : undefined),
  });
}
