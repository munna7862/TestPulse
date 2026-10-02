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
