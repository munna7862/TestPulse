import { createTenantDb, type PrismaClient } from "@testpulse/db";
import { API_KEY_LIVE_PREFIX } from "@testpulse/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ApiError } from "../lib/api-error";
import { hashApiKey } from "../modules/api-keys/api-keys.service";
import { RateLimitedError, type RateLimitStore } from "../modules/auth/rate-limiter";

const DEFAULT_PER_KEY_MAX = 20;
const DEFAULT_PER_PROJECT_MAX = 60;
const DEFAULT_WINDOW_MS = 1_000;
const DEFAULT_LAST_USED_THROTTLE_MS = 60_000;
const MAX_API_KEY_LENGTH = 128;
const MAX_LAST_USED_CACHE_SIZE = 10_000;

export interface ApiKeyRequestContext {
  orgId: string;
  projectId: string;
  apiKeyId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    apiKeyContext?: ApiKeyRequestContext;
  }
}

export interface ApiKeyAuthHookOptions {
  db: PrismaClient;
  rateLimitStore?: RateLimitStore;
  perKeyMax?: number;
  perProjectMax?: number;
  windowMs?: number;
  lastUsedThrottleMs?: number;
  now?: () => Date;
}

function extractBearerApiKey(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const spaceIdx = authorization.indexOf(" ");
  if (spaceIdx === -1) return null;
  const scheme = authorization.slice(0, spaceIdx);
  if (scheme.toLowerCase() !== "bearer") return null;
  const token = authorization.slice(spaceIdx + 1).trim();
  if (!token || token.length > MAX_API_KEY_LENGTH || !token.startsWith(API_KEY_LIVE_PREFIX)) return null;
  if ([...token].some((c) => c.charCodeAt(0) <= 0x1f || c.charCodeAt(0) === 0x7f)) return null;
  return token;
}

/**
 * Ingestion API Bearer authentication preHandler (ADR-006 Layer 2-3, security model §2.5 & §5).
 * Session cookies are ignored; lookup uses systemDb by SHA-256 hash; rate limits fail open on
 * store outages to avoid blocking customer CI runs; `lastUsedAt` writes are throttled per minute.
 */
export function createApiKeyAuthHook({
  db,
  rateLimitStore,
  perKeyMax = DEFAULT_PER_KEY_MAX,
  perProjectMax = DEFAULT_PER_PROJECT_MAX,
  windowMs = DEFAULT_WINDOW_MS,
  lastUsedThrottleMs = DEFAULT_LAST_USED_THROTTLE_MS,
  now: getNow = () => new Date(),
}: ApiKeyAuthHookOptions) {
  // Per-instance throttle gate prevents concurrent bursts from issuing duplicate UPDATE queries;
  // cross-instance concurrency is also serialized by the SQL predicate on lastUsedAt.
  const lastUsedCache = new Map<string, number>();

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const rawKey = extractBearerApiKey(request.headers.authorization);
    if (!rawKey) {
      throw new ApiError(401, "Missing or invalid API key.", "INVALID_API_KEY");
    }

    const now = getNow();
    const keyHash = hashApiKey(rawKey);
    // ADR-006 Layer 3 explicit systemDb exception: resolve tenant from API key hash before org/project is known.
    const record = await db.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        orgId: true,
        projectId: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
        project: {
          select: {
            deletedAt: true,
            org: { select: { deletedAt: true } },
          },
        },
      },
    });

    if (
      !record ||
      record.revokedAt !== null ||
      (record.expiresAt !== null && record.expiresAt.getTime() <= now.getTime()) ||
      record.project.deletedAt !== null ||
      record.project.org.deletedAt !== null
    ) {
      throw new ApiError(401, "Missing or invalid API key.", "INVALID_API_KEY");
    }

    const ctx: ApiKeyRequestContext = {
      orgId: record.orgId,
      projectId: record.projectId,
      apiKeyId: record.id,
    };
    request.apiKeyContext = ctx;

    if (rateLimitStore) {
      let retryAfterMs = 0;
      try {
        const keyHit = await rateLimitStore.hit(`ingest:key:${record.id}`, windowMs);
        if (keyHit.count > perKeyMax) {
          retryAfterMs = keyHit.resetMs;
        } else {
          const projectHit = await rateLimitStore.hit(`ingest:project:${record.projectId}`, windowMs);
          if (projectHit.count > perProjectMax) retryAfterMs = projectHit.resetMs;
        }
      } catch (error) {
        // Security model §5: ingestion rate limits fail open when Redis is unreachable (CI safety).
        request.log.warn({ err: error }, "ingest rate-limit store unavailable; failing open");
        retryAfterMs = 0;
      }

      if (retryAfterMs > 0) {
        const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
        void reply.header("retry-after", String(seconds));
        throw new RateLimitedError(seconds);
      }
    }

    const cutoffMs = now.getTime() - lastUsedThrottleMs;
    const cachedAtMs = lastUsedCache.get(record.id);
    const dueInDb = record.lastUsedAt === null || record.lastUsedAt.getTime() <= cutoffMs;
    const dueInCache = cachedAtMs === undefined || cachedAtMs <= cutoffMs;
    if (dueInDb && dueInCache) {
      if (lastUsedCache.size >= MAX_LAST_USED_CACHE_SIZE) lastUsedCache.clear();
      lastUsedCache.set(record.id, now.getTime());
      try {
        await createTenantDb(db, ctx).apiKey.updateMany({
          where: {
            id: record.id,
            revokedAt: null,
            OR: [{ lastUsedAt: null }, { lastUsedAt: { lte: new Date(cutoffMs) } }],
          },
          data: { lastUsedAt: now },
        });
      } catch (error) {
        lastUsedCache.delete(record.id);
        request.log.warn({ err: error }, "failed to update API key lastUsedAt timestamp");
      }
    }
  };
}

/** Returns the resolved ingestion API key context or throws if the route omitted `authenticateApiKey`. */
export function apiKeyContextOf(request: FastifyRequest): ApiKeyRequestContext {
  if (!request.apiKeyContext) {
    throw new Error("API key context missing: route is not guarded by authenticateApiKey.");
  }
  return request.apiKeyContext;
}
