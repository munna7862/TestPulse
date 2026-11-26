# S-008a: API keys schema, management endpoints, ingest auth & rate limits (P03-S05 part 1/2)

Milestone: P03 Auth & Multi-Tenancy · Appetite: 1 session · Risk: high (plaintext secret leakage, ingest key scope escape, key lookup hotspot, Redis outage handling)
Replaces or covers: P03-S05 tasks 1–7 (`FR-KEY-01`..`FR-KEY-04`)

## Outcome
Project Admins and Owners can generate project-scoped CI API keys (`tp_live_...`, returned in plaintext once and persisted only as a SHA-256 `keyHash` + 8-character `prefix`), list key metadata and status without hashes, and immediately revoke keys; `/api/v1/ingest/*` requests authenticate via Bearer API keys (`authenticateApiKey`), enforce key/project isolation and throttled `lastUsedAt` tracking, and apply fail-open Redis-backed per-key and per-project rate limits.

## Acceptance criteria (EARS)
- AC1 When an Admin or Owner calls `POST /api/v1/projects/:projectId/api-keys` with `{ name, expiresAt? }` (`[SC-KEY-001]`, `[SC-KEY-002]`), the API shall verify live project/org state and write-time `apiKey.manage` role, generate `tp_live_` + 32 random bytes encoded as base62, store `prefix` (first 8 chars after `tp_live_`) and `keyHash = sha256(plaintextKey)` (never storing or logging plaintext), return `201` with `CreatedApiKeySchema` (`plaintextKey` shown once), reject invalid bodies/past `expiresAt` with `400`, reject Member/Viewer with `403`, and reject outsiders/malformed/soft-deleted tenants with `404`.
- AC2 When an Admin or Owner lists or revokes project API keys (`[SC-KEY-003]`, `[SC-KEY-004]`), `GET /api/v1/projects/:projectId/api-keys` shall return `{ id, orgId, projectId, name, prefix, createdById, createdByName, lastUsedAt, expiresAt, revokedAt, status, createdAt }` (`ApiKeySchema`, newest first) without `keyHash` or `plaintextKey`; `DELETE /api/v1/projects/:projectId/api-keys/:keyId` shall atomically set `revokedAt` (`204`, `404` on missing/cross-project/already-revoked) and invalidate the key immediately.
- AC3 When an `/api/v1/ingest/*` route runs `authenticateApiKey` (`[SC-KEY-004]`, `[SC-KEY-005]`, `[SC-KEY-006]`), it shall accept `Authorization: Bearer tp_live_<...>` exclusively (ignoring session cookies), resolve `{ orgId, projectId, apiKeyId }` via SHA-256 `keyHash` against live non-deleted projects/orgs, reject missing/invalid/revoked/expired/orphaned keys with `401 INVALID_API_KEY`, throttle `lastUsedAt` updates to at most once per minute per key, isolate data access via `createTenantDb({ orgId, projectId })`, and fail all non-ingest endpoints (`401 UNAUTHENTICATED`) when presented only with an API key.
- AC4 While an active API key exceeds its per-key or per-project ingestion rate limit (`[SC-KEY-007]`), the preHandler shall return `429 RATE_LIMITED` with `Retry-After` without affecting other keys or projects, and shall fail **open** with warning logs if the rate-limit store errors or times out (`security-model.md §5`).

## Non-goals
- Web API keys settings UI and copyable reporter setup snippet (next slice: **S-008b**).
- Actual `/api/v1/ingest/runs*` domain models and handlers (**P04-S01 / P04-S02**).

## Contracts touched (read only these sections)
- `planning/master/TestPulse_Master_Plan.md` §4.2, §5 (`ApiKey`), §7 (`apiKey.manage`, API key ingest-only scope).
- `docs/security/security-model.md` §2.5 (API keys) & §5 (Ingestion rate limiting fail-open).
- `docs/api/rest-api.md` §2 (`GET/POST /projects/:projectId/api-keys`, `DELETE .../api-keys/:keyId`).
- `packages/db/prisma/schema.prisma`, `packages/db/src/tenant-scope.ts` (`MODEL_SCOPE.ApiKey`), `packages/shared/src/api/api-keys.ts`.

## Risks to test explicitly
- Secret leakage: `keyHash` never selected/serialized to callers; `plaintextKey` omitted from list/revoke and added to `LOG_REDACT_PATHS` (`*.plaintextKey`).
- Isolation & auth boundary: `404` for outsiders/wrong-project/malformed `:keyId`/`:projectId`, `403` for Member/Viewer, `401 UNAUTHENTICATED` when using API key on REST routes, `401 INVALID_API_KEY` when using cookies on ingest routes.
- Races & throttling: concurrent revocation vs ingest (`Promise.all`), `lastUsedAt` throttled under rapid burst requests, concurrent rate-limit bucket isolation between keys/projects.

## Tests written first
- `packages/shared/src/api/api-keys.test.ts`, `apps/api/test/api-keys/api-keys.acceptance.test.ts`, `apps/api/test/api-keys/s008a-review.acceptance.test.ts`, and `apps/api/test/projects/project-tenant-context.acceptance.test.ts` cover AC1–AC4 (`[SC-KEY-001]`..`[SC-KEY-007]`, `[SC-SEC-001]`, `[SC-SEC-002]`, `[SC-SEC-003]`).

## Done means
Required checks green · claims, security and test audits pass with zero unaddressed proved findings · PR merged with green CI on `main`.
