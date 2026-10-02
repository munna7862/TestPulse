import { z } from "zod";

/** OAuth providers supported in v1 (master plan §5 `OAuthProvider`). */
export const OAuthProviderSchema = z.enum(["google", "github"]);
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;

/**
 * Error codes carried in the `code` query parameter of the web app's `/oauth/error` page.
 * Only these opaque codes travel in URLs — never emails, tokens, or provider error text.
 */
export const OAuthErrorCodeSchema = z.enum([
  "ACCESS_DENIED",
  "INVALID_STATE",
  "PROVIDER_ERROR",
  "PROVIDER_NOT_CONFIGURED",
  "EMAIL_UNVERIFIED",
  "EMAIL_CONFLICT",
  "ACCOUNT_ALREADY_LINKED",
  "ACCOUNT_DISABLED",
]);
export type OAuthErrorCode = z.infer<typeof OAuthErrorCodeSchema>;

export const OAuthProviderParamsSchema = z.object({
  provider: z.string().min(1).max(32),
});

export const OAuthStartQuerySchema = z.object({
  returnTo: z.string().max(512).optional(),
});
export type OAuthStartQuery = z.infer<typeof OAuthStartQuerySchema>;

export const OAuthCallbackQuerySchema = z.object({
  code: z.string().max(2048).optional(),
  state: z.string().max(512).optional(),
  error: z.string().max(256).optional(),
});
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;

// --- Linked accounts (profile settings) ---
export const LinkedOAuthAccountSchema = z.object({
  id: z.string(),
  provider: OAuthProviderSchema,
  createdAt: z.string(),
});
export type LinkedOAuthAccount = z.infer<typeof LinkedOAuthAccountSchema>;

export const ListOAuthAccountsResponseSchema = z.object({
  accounts: z.array(LinkedOAuthAccountSchema),
  /** Whether the user can also sign in with a password (guards unlinking the last method). */
  hasPassword: z.boolean(),
});
export type ListOAuthAccountsResponse = z.infer<typeof ListOAuthAccountsResponseSchema>;

export const StartOAuthLinkResponseSchema = z.object({
  authorizationUrl: z.string().url(),
});
export type StartOAuthLinkResponse = z.infer<typeof StartOAuthLinkResponseSchema>;

export const OAuthAccountParamsSchema = z.object({
  id: z.string().min(1).max(64),
});

export const UnlinkOAuthAccountResponseSchema = z.object({
  unlinked: z.boolean(),
});
export type UnlinkOAuthAccountResponse = z.infer<typeof UnlinkOAuthAccountResponseSchema>;

// --- Post-login redirect allow-list ---

/** Where users land after sign-in when no (valid) `returnTo` was supplied. */
export const DEFAULT_RETURN_TO = "/runs";

/** Path prefixes of the web app that a post-login redirect may target. Extend as new areas ship. */
export const ALLOWED_RETURN_TO_PREFIXES: readonly string[] = ["/runs", "/settings"];

const MAX_RETURN_TO_LENGTH = 512;
// A placeholder origin only used to detect inputs that parse to a different origin than "relative".
const PLACEHOLDER_ORIGIN = "http://return-to.invalid";
// eslint-disable-next-line no-control-regex -- intentionally matches control characters to reject them
const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

/**
 * Reduces a user-supplied post-login redirect to a safe, same-origin, allow-listed path (open-redirect
 * guard). Anything that is not a plain `/path?query` under an allowed prefix returns `fallback`.
 * Fragments are dropped. Pure and browser-safe.
 */
export function sanitizeReturnTo(input: string | null | undefined, fallback: string = DEFAULT_RETURN_TO): string {
  if (typeof input !== "string" || input.length === 0 || input.length > MAX_RETURN_TO_LENGTH) return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || CONTROL_OR_BACKSLASH.test(input)) return fallback;

  let url: URL;
  try {
    url = new URL(input, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;

  const allowed = ALLOWED_RETURN_TO_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
  if (!allowed) return fallback;

  return `${url.pathname}${url.search}`;
}

// --- Provider payloads (untrusted third-party responses, validated at the boundary) ---

/** Google OpenID Connect `userinfo` response. `email_verified` is a boolean (some tooling returns a string). */
export const GoogleUserInfoSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.string().max(320).optional(),
  email_verified: z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]).optional(),
  name: z.string().max(255).optional(),
  picture: z.string().max(2048).optional(),
});
export type GoogleUserInfo = z.infer<typeof GoogleUserInfoSchema>;

/** GitHub `GET /user`. The `email` field is deliberately not modelled: it is never trusted. */
export const GitHubUserSchema = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1).max(255),
  name: z.string().max(255).nullish(),
  avatar_url: z.string().max(2048).nullish(),
});
export type GitHubUser = z.infer<typeof GitHubUserSchema>;

/** GitHub `GET /user/emails`. */
export const GitHubEmailsSchema = z.array(
  z.object({
    email: z.string().max(320),
    primary: z.boolean(),
    verified: z.boolean(),
  }),
);
export type GitHubEmails = z.infer<typeof GitHubEmailsSchema>;
