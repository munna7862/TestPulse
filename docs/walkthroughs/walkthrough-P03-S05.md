# Walkthrough: P03-S05 — Project API Keys & Ingestion Bearer Auth (`S-008a` + `S-008b`)

Completed across **S-008a** (schema, API CRUD, ingest auth & rate limits) and **S-008b** (`/settings/api-keys` Web UI):

## 1. Persistence & Shared Contracts (`S-008a`)
- **`packages/db/prisma/schema.prisma` & `20261126130000_api_keys`:** Added `ApiKey` (`id` UUIDv7, `orgId`, `projectId`, `name`, `prefix`, `keyHash @unique`, `createdById`, `lastUsedAt?`, `expiresAt?`, `revokedAt?`), indexes on `(projectId, revokedAt)` and `orgId`, and `ON DELETE CASCADE` foreign keys. Classified as `"project"` in `MODEL_SCOPE`.
- **`packages/shared/src/api/api-keys.ts`:** Exported `API_KEY_LIVE_PREFIX`, `ApiKeyIdSchema`, `ApiKeyParamsSchema`, `ApiKeyNameSchema`, `ApiKeyStatusSchema`, `CreateApiKeyBodySchema`, `ApiKeySchema`, `CreatedApiKeySchema`, and response envelopes.

## 2. Management Endpoints & Ingest Bearer Auth (`S-008a`)
- **`apps/api/src/plugins/tenant-context.ts` & `apps/api/src/modules/api-keys/`:** Registered `GET/POST /api/v1/projects/:projectId/api-keys` and `DELETE /api/v1/projects/:projectId/api-keys/:keyId` (`apiKey.manage`, Admin+ minimum). `ApiKeyService` generates `tp_live_` + 32 random bytes encoded as 43 base62 characters, persists only an 8-char `prefix` and SHA-256 `keyHash`, returns `plaintextKey` once on `201`, and enforces write-time live org/project/role checks under `Organization FOR UPDATE`.
- **`apps/api/src/plugins/api-key-auth.ts`:** `createApiKeyAuthHook` authenticates `/api/v1/ingest/*` exclusively via `Authorization: Bearer tp_live_<...>` (ignoring session cookies), resolves `{ orgId, projectId, apiKeyId }` against non-revoked, non-expired, live tenants (`401 INVALID_API_KEY` otherwise), coalesces `lastUsedAt` writes (`<= 1/min`), and applies fail-open per-key and per-project rate limits (`429 RATE_LIMITED` + `Retry-After`).
- **`apps/api/src/log-redaction.ts`:** Added `*.plaintextKey` alongside `req.headers.authorization` in `LOG_REDACT_PATHS`.

## 3. Web Settings UI & Show-Once Workflow (`S-008b`)
- **`apps/web/src/lib/api-keys.ts`:** Added `createApiKeysClient` (`listApiKeys`, `createApiKey`, `revokeApiKey`), `canManageApiKeys` (`can(role, "apiKey.manage")`), `buildExpiresAtIso`, `formatApiKeyError`, and `buildReporterSnippet` (`@testpulse/reporter/playwright` and `@testpulse/reporter/vitest` referencing `process.env.TESTPULSE_API_KEY`).
- **`apps/web/src/app/(app)/settings/layout.tsx`, `api-keys/page.tsx`, `ApiKeysManagement.tsx`, `CreateApiKeyDialog.tsx`:** Added **API keys** to Settings navigation; displays loading/empty/error/permission-gated states, key table (`tp_live_<prefix>…`, `ACTIVE`/`EXPIRED`/`REVOKED` badges, creator, timestamps), show-once creation dialog with copy button and reporter snippets, and confirmation dialog for immediate revocation.

## Verification Highlights
- API acceptance & unit suites: `packages/shared/src/api/api-keys.test.ts`, `apps/api/test/log-redaction.test.ts`, `apps/api/test/api-keys/api-keys.acceptance.test.ts`, `apps/api/test/api-keys/s008a-review.acceptance.test.ts`, and `apps/api/test/projects/project-tenant-context.acceptance.test.ts`.
- Web unit & E2E suites: `apps/web/src/lib/api-keys.acceptance.test.ts` and `apps/web/e2e/api-keys-settings.spec.ts` (including light/dark `@axe-core/playwright` scans).
