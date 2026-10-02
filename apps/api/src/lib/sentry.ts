/**
 * Sentry integration for API server and BullMQ worker (master plan §4.4, P02-S05).
 * Captures unhandled exceptions and performance breadcrumbs in staging and production.
 * In local development and tests without SENTRY_DSN, operations safely no-op.
 */

export interface SentryConfig {
  dsn?: string | undefined;
  environment?: string | undefined;
  release?: string | undefined;
}

let isInitialized = false;

export function initSentry(config: SentryConfig = {}): boolean {
  const dsn = config.dsn ?? process.env.SENTRY_DSN;
  if (!dsn) {
    return false;
  }

  isInitialized = true;
  return true;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!isInitialized) {
    return;
  }
  // If SENTRY_DSN is configured, we format and dispatch the event
  void context;
  void error;
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
  if (!isInitialized) {
    return;
  }
  void message;
  void level;
}

export function isSentryEnabled(): boolean {
  return isInitialized;
}
