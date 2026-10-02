/** Secret-bearing fields that must never reach logs (docs/security/security-model.md §7). */
export const LOG_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "*.password",
  "*.token",
  "*.apiKey",
  "*.secret",
];

const OAUTH_PATH_PREFIX = "/api/v1/auth/oauth/";

/**
 * OAuth callbacks carry the one-time authorization `code` and the `state` value in the query string.
 * Request logs keep the path (useful for debugging) but drop the query for those routes.
 */
export function redactRequestUrl(url: string): string {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) return url;
  return url.startsWith(OAUTH_PATH_PREFIX) ? `${url.slice(0, queryStart)}?[REDACTED]` : url;
}
