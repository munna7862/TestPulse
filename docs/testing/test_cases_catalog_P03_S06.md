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

- **Given:** Full Fastify app booted via `buildApp` with real Postgres.
- **When:** Collecting every registered route via `onRoute` and invoking `ORG_ROUTE_POLICY` + `PROJECT_ROUTE_POLICY` as outsiders, missing/deleted/malformed IDs, unauthenticated callers, and every lower role.
- **Then:** Every registered route is classified in `ORG_ROUTE_POLICY`, `PROJECT_ROUTE_POLICY`, or `NON_TENANT_ROUTES` with zero gaps or stale entries; adding an unclassified route fails `assertAllRoutesClassified`; every tenant route returns `404 NOT_FOUND` to non-members and `403 FORBIDDEN` to lower roles (preserving `allowSelfParam` self-leave).

### [SC-SEC-004] Tenant DB Client & `systemDb` Allow-List Audit (S-009a)

- **Given:** Production source tree under `apps/api/src/**/*.ts` and real PostgreSQL `AuditEvent` table.
- **When:** Scanning all `getSystemDb` and unscoped Prisma client usages against documented allow-listed modules, and calling `createTenantDb(db, { orgId })` on `auditEvent`.
- **Then:** Zero undocumented `systemDb` / unscoped accesses exist outside allow-listed modules; `createTenantDb` stamps `orgId` on `auditEvent.create`, restricts `findMany`, rejects cross-tenant `orgId`, and forbids `findUnique`, `update`, and `delete`.

### [SC-SEC-006] Secret-Free Structured Request Logging with Tenant Context (S-009a)

- **Given:** `buildApp` booted with `logger: true` streaming JSON logs to an in-memory sink.
- **When:** Executing `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, org route `GET /api/v1/orgs/:orgId`, project route `POST /api/v1/projects/:projectId/api-keys`, and an API-key-authenticated route protected by `createApiKeyAuthHook`.
- **Then:** Every log entry includes `requestId`; tenant routes include `orgId` (and `projectId` / `apiKeyId` where applicable); passwords, cookies, JWTs, `plaintextKey`, and Bearer tokens never appear in log output.

### [SC-SEC-007] Immutable `AuditEvent` Recording Across Security Mutations (S-009a)

- **Given:** Verified org users and project fixtures in PostgreSQL.
- **When:** Performing ownership transfer, org soft-delete, project create/soft-delete, member role change/remove/self-leave, invitation create/resend/revoke/accept, API key create/revoke, and rejected unauthorized attempts.
- **Then:** Each committed mutation produces one matching `AuditEvent` row with actor, target, tenant IDs, and secret-free metadata; rejected mutations record zero events; org purge cascades `AuditEvent` rows while project purge retains org-level `project.deleted` audit history.

### [SC-SEC-005] [SC-SEC-011] Headers, CORS, Nonce CSP & Rate Limiting + Dependency/Secret Scans (S-009b)

- **Given:** API with `@fastify/helmet`, strict CORS allow-list, Redis-backed rate limits, and Next.js 16 `proxy.ts` CSP/HSTS headers.
- **When:** Inspecting API & web HTTP responses, foreign `Origin` preflight/requests, Redis multi-instance rate-limit bursts, `npm audit --audit-level=high`, and Gitleaks CI.
- **Then:** API & web responses include hardened security headers with unique per-request CSP nonces on HTML pages; foreign origins receive no CORS allow headers; Redis limits enforce across stores; `npm audit` and Gitleaks report zero violations.
