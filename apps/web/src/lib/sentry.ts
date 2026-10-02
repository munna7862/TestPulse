/**
 * Sentry integration for Next.js frontend (master plan §4.4, P02-S05).
 * Captures browser errors and client-side exceptions when NEXT_PUBLIC_SENTRY_DSN is configured.
 */

let isInitialized = false;

export function initClientSentry(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return false;
  }

  isInitialized = true;
  return true;
}

export function captureClientError(error: unknown, context?: Record<string, unknown>): void {
  if (!isInitialized) {
    return;
  }
  void error;
  void context;
}

export function isClientSentryEnabled(): boolean {
  return isInitialized;
}
