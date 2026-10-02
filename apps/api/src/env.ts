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
  TRUST_PROXY: booleanString.default(false),
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
  /** Per-IP limit for password login (security model §5). */
  AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).default(60),
  /** Per-IP limit for register, forgot-password, reset-password (security model §5). */
  AUTH_RATE_LIMIT_RECOVERY_PER_HOUR: z.coerce.number().int().min(1).max(10_000).default(60),
});
export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function loadApiEnv(source: Record<string, string | undefined> = process.env): ApiEnv {
  // Render exposes the deployed commit as RENDER_GIT_COMMIT; the staging smoke check compares it via /health.
  return parseEnv(ApiEnvSchema, { ...source, GIT_COMMIT_SHA: source.GIT_COMMIT_SHA ?? source.RENDER_GIT_COMMIT });
}
