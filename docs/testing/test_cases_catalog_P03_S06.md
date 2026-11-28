# Test Cases Catalog — Phase 03 Sprint 06: Tenant Isolation & Security Hardening

## 1. Metadata & Traceability

- **Sprint:** P03-S06: Tenant Isolation Verification and Security Hardening (delivered as slices **S-009a** and **S-009b**)
- **Phase:** Phase 03: Authentication & Multi-Tenancy
- **Feature Traceability:**
  - `FR-SEC-01` (Tenant isolation on every route: 404 cross-tenant, 403 insufficient role, meta-test route classification)
  - `FR-SEC-02` (Tenant-scoped DB client enforcement and `systemDb` justification audit)
  - `FR-SEC-03` (Security headers on API + web, nonce CSP, and CORS allow-list — S-009b)
  - `FR-SEC-04` (Secret-free structured request logging and immutable `AuditEvent` recording)
  - `FR-SEC-06` (`npm audit --audit-level=high` and Gitleaks CI gates — S-009b)
- **Scenario Traceability:** `SC-SEC-001`, `SC-SEC-002`, `SC-SEC-003`, `SC-SEC-004`, `SC-SEC-005`, `SC-SEC-006`, `SC-SEC-007`, `SC-SEC-011`
- **Lead Persona:** `role-security-engineer`
- **Reviewer Personas:** `role-backend-engineer`, `role-sdet-architect`

## 2. Test Data & Fixtures

| Fixture | Value |
| :--- | :--- |
| Tenant A / Tenant B | Two distinct organizations (`Owner`, `Admin`, `Member`, `Viewer` in A; `Outsider` Owner in B) |
| Soft-deleted fixtures | Soft-deleted `Organization`, soft-deleted `Project`, and soft-deleted org's orphan `Project` |
| API key placeholder | Low-entropy key generated via `generateApiKeySecret()` or `tp_live_${"a".repeat(43)}` (never high-entropy hardcoded literals) |
| Audit actions | `org.ownership_transferred`, `org.deleted`, `project.created`, `project.deleted`, `member.role_changed`, `member.removed`, `member.left`, `invitation.created`, `invitation.resent`, `invitation.revoked`, `invitation.accepted`, `api_key.created`, `api_key.revoked` |

## 3. Test Scenarios Register

### [SC-SEC-001] [SC-SEC-002] [SC-SEC-003] Full-App Route Classification & Cross-Tenant / Role Enforcement (S-009a)

- **Given:** Full Fastify app booted via `buildApp` with real Postgres (`tenant-isolation-audit.acceptance.test.ts` + `s009a-review.acceptance.test.ts`).
- **When:** Collecting every registered route via `onRoute` and invoking `ORG_ROUTE_POLICY` + `PROJECT_ROUTE_POLICY` across outsiders, missing/deleted/malformed IDs, unauthenticated callers, every lower role, and `allowSelfParam` self-leave; plus feeding trailing-slash, duplicate, stale, `optional`, and standalone `HEAD` routes to `assertAllRoutesClassified`.
- **Then:** Every registered route appears in `ORG_ROUTE_POLICY`, `PROJECT_ROUTE_POLICY`, or `NON_TENANT_ROUTES` with zero gaps, duplicates, trailing-slash collapses, or stale entries; unclassified or standalone `HEAD` routes throw; outsiders and missing/deleted/malformed IDs get `404 NOT_FOUND`; unauthenticated requests get `401`; lower roles get `403 FORBIDDEN` (preserving `allowSelfParam` self-leave).

### [SC-SEC-004] Tenant DB Client, Raw SQL & `systemDb` Allow-List Audit (S-009a)

- **Given:** Production source tree under `apps/api/src/**/*.ts` and real PostgreSQL `AuditEvent` table.
- **When:** Scanning all `getSystemDb`, `createPrismaClient`, unscoped Prisma `$transaction` / model accesses, and `$queryRaw`/`$executeRaw` usages against documented ADR-006 modules (`s009a-review.acceptance.test.ts`), and running `createTenantDb` operations across two orgs.
- **Then:** Zero undocumented `systemDb` accesses or `$queryRawUnsafe`/`$executeRawUnsafe` calls exist; every `$queryRaw` carries an explicit tenant ID predicate; `createTenantDb` stamps `orgId` on `auditEvent.create`, isolates `findMany` across orgs, blocks cross-tenant `create`/`createMany`, and forbids `findUnique`/`update`/`delete`.

### [SC-SEC-006] Secret-Free Structured Request Logging with Tenant Context (S-009a)

- **Given:** `buildApp` booted with `logger: true` streaming JSON logs, plus an API-key ingest probe configured with `buildApp` Pino redaction and `createApiKeyAuthHook` (since `/api/v1/ingest/*` lands in P04-S02), and unit checks in `apps/api/test/log-redaction.test.ts`.
- **When:** Executing login, refresh, org route, project API key route, `GET /api/v1/auth/oauth/:provider/callback?code=...&state=...` on `buildApp`, and `createApiKeyAuthHook` Bearer request, plus logging top-level/1-level/2-level secret keys and error-nested headers.
- **Then:** Every HTTP log entry carries `requestId`; tenant routes bind `orgId`, `projectId`, and `apiKeyId`; OAuth callback query parameters log as `?[REDACTED]`; passwords, cookies, `set-cookie`, JWTs, tokens, `plaintextKey`, `keyHash`, `codeVerifier`, and nested `headers.authorization`/`headers.cookie` never appear unredacted.

### [SC-SEC-007] Immutable `AuditEvent` Recording Across Security Mutations (S-009a)

- **Given:** Verified org users and project fixtures in PostgreSQL.
- **When:** Performing all 13 security actions (with full `actorUserId`, `actorApiKeyId`, `projectId`, `targetType`, `targetId`, `metadata` checks), rejected `403` attempts, transactional soft-delete/membership refusal races (`403` demotion & `404` deleted org/project), rollback on write failure, and org/project purge (`audit-and-logging.acceptance.test.ts` + `s009a-review.acceptance.test.ts`).
- **Then:** Committed mutations record matching `AuditEvent` rows atomically without secrets; refused/rolled-back mutations emit zero events; `purgeSoftDeletedProject` preserves `project.deleted` org history while `purgeSoftDeletedOrg` cascades all org `AuditEvent` rows.

### [SC-SEC-005] [SC-SEC-011] Headers, CORS, Nonce CSP & Rate Limiting + Dependency/Secret Scans (S-009b)

- **Given:** API with `@fastify/helmet`, strict CORS allow-list, Redis-backed rate limits, and Next.js 16 `proxy.ts` CSP/HSTS headers.
- **When:** Inspecting API & web HTTP responses, foreign `Origin` preflight/requests, Redis multi-instance rate-limit bursts, `npm audit --audit-level=high`, and Gitleaks CI.
- **Then:** API & web responses include hardened security headers with unique per-request CSP nonces on HTML pages; foreign origins receive no CORS allow headers; Redis limits enforce across stores; `npm audit` and Gitleaks report zero violations.

### [SC-AUTH-017] [SC-AUTH-025] [SC-SEC-012] Proxy trust and shared request budgets (S-009b)

- **Given:** Two API instances share a rate-limit store and the hosted web proxy is configured with an upstream verification credential.
- **When:** Two verified proxy clients sign in through one egress address, a direct API request supplies an unverified proxy assertion, OAuth requests cross instances, or the rate-limit store becomes unavailable.
- **Then:** The API uses separate budgets for verified client addresses and falls back to the direct request address for an unverified assertion. OAuth start and callback share one budget and return `503` on store failure. Authenticated REST enforces a per-user budget and continues during the outage.
