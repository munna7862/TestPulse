import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Redis } from "../../lib/redis";

/**
 * Fixed-window rate limiting for the password-auth routes (docs/security/security-model.md §5).
 * Each route checks several rules (per IP and per email); any rule over its limit returns 429.
 * Counters live in Redis when REDIS_URL is set, so every instance shares them. If the store fails, the
 * request is refused with 503: these routes fail closed.
 */
export interface RateLimitStore {
  /** Counts one hit for `key` and returns the count in the current window and ms until it resets. */
  hit(key: string, windowMs: number): Promise<{ count: number; resetMs: number }>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string, windowMs: number): Promise<{ count: number; resetMs: number }> {
    const now = Date.now();
    const current = this.windows.get(key);
    if (!current || current.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs });
      if (this.windows.size > 50_000) this.prune(now);
      return { count: 1, resetMs: windowMs };
    }
    current.count += 1;
    return { count: current.count, resetMs: current.resetAt - now };
  }

  private prune(now: number): void {
    for (const [key, value] of this.windows) if (value.resetAt <= now) this.windows.delete(key);
  }
}

// INCR and the first PEXPIRE run atomically, so concurrent instances can never leave a key without a TTL.
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

export class RedisRateLimitStore implements RateLimitStore {
  constructor(
    private readonly redis: Redis,
    private readonly prefix = "tp:rl",
  ) {}

  async hit(key: string, windowMs: number): Promise<{ count: number; resetMs: number }> {
    const reply: unknown = await this.redis.eval(HIT_SCRIPT, 1, `${this.prefix}:${key}`, String(windowMs));
    if (!Array.isArray(reply) || typeof reply[0] !== "number" || typeof reply[1] !== "number") {
      throw new Error("Unexpected rate-limit reply from Redis");
    }
    return { count: reply[0], resetMs: reply[1] > 0 ? reply[1] : windowMs };
  }
}

export interface RateLimitRule {
  /** Bucket name; rules with the same name share a counter (e.g. register, resend and forgot). */
  bucket: string;
  max: number;
  windowMs: number;
  /** Returns the value to count by, or undefined to skip this rule for the request. */
  key: (request: FastifyRequest) => string | undefined;
}

export class RateLimitedError extends Error {
  readonly statusCode = 429;
  constructor(readonly retryAfterSeconds: number) {
    super(`Too many requests. Try again in ${retryAfterSeconds} seconds.`);
    this.name = "RateLimitedError";
  }
}

export class RateLimitUnavailableError extends Error {
  readonly statusCode = 503;
  constructor() {
    super("Sign-in is temporarily unavailable. Please try again shortly.");
    this.name = "RateLimitUnavailableError";
  }
}

/** Per-IP key. `request.ip` honours X-Forwarded-For only for the proxy hops configured in TRUST_PROXY. */
export const byIp = (request: FastifyRequest): string => `ip:${request.ip}`;

/** Per-account key from the request body. Emails are normalised like the service does, then hashed (no PII in Redis). */
export function byEmail(request: FastifyRequest): string | undefined {
  const body = request.body;
  if (typeof body !== "object" || body === null || !("email" in body) || typeof body.email !== "string")
    return undefined;
  const email = body.email.trim().toLowerCase();
  return `email:${crypto.createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
}

/** Builds a preHandler that applies every rule. Runs after body validation, so per-email rules can read the body. */
export function rateLimitHook(store: RateLimitStore, rules: readonly RateLimitRule[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    let retryAfterMs = 0;
    for (const rule of rules) {
      const key = rule.key(request);
      if (key === undefined) continue;
      let result: { count: number; resetMs: number };
      try {
        result = await store.hit(`${rule.bucket}:${key}`, rule.windowMs);
      } catch (error) {
        request.log.error({ err: error }, "rate-limit store unavailable; failing closed");
        throw new RateLimitUnavailableError();
      }
      if (result.count > rule.max) retryAfterMs = Math.max(retryAfterMs, result.resetMs);
    }
    if (retryAfterMs > 0) {
      const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      void reply.header("retry-after", String(seconds));
      throw new RateLimitedError(seconds);
    }
  };
}
