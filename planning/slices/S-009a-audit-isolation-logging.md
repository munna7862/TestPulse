# S-009a: AuditEvent model, tenant-scoped logging & full-app route isolation audit

Milestone: M1 First live run · Appetite: 1 session · Risk: medium (cross-service audit transaction hooks + full-app route guard enforcement)
Replaces or covers: P03-S06 part 1/2 (`FR-SEC-01`, `FR-SEC-02`, `FR-SEC-04`)

## Outcome
Security-relevant mutations across organizations, projects, members, invitations, and API keys atomically record immutable `AuditEvent` entries in PostgreSQL within the same transaction; every API request log carries `requestId` plus resolved tenant context (`orgId`, `projectId`, `apiKeyId`) with secrets redacted; and full-app route registration and `systemDb` usage are continuously verified by table-driven and static meta-tests so no unclassified route or unscoped query can slip in unnoticed.

## Acceptance criteria (EARS)
AC1 When `buildApp` registers routes or when any code in `apps/api/src` accesses the database, `assertAllRoutesClassified` shall prove that every registered route belongs to `ORG_ROUTE_POLICY`, `PROJECT_ROUTE_POLICY`, or `NON_TENANT_ROUTES` (zero unclassified routes and zero stale entries), every tenant route shall return 404 to outsiders and 403 to insufficient roles, and `systemDb` / unscoped client access shall remain restricted to documented allow-listed modules (`[SC-SEC-001]..[SC-SEC-004]`).
AC2 When an organization ownership transfer or deletion, member role change, removal, or self-leave, project creation or deletion, invitation creation, resend, revocation, or acceptance, or API key creation or revocation commits, the service shall persist one `AuditEvent` record inside the same database transaction with `orgId`, optional `projectId`, `actorUserId`, `action`, `targetType`, `targetId`, and secret-free `metadata` (`[SC-SEC-007]`).
AC3 While Fastify request logging is enabled across auth (login/refresh), org, project, and API-key requests, the API shall bind `requestId`, `orgId`, optional `projectId`, and optional `apiKeyId` onto request logs while redacting passwords, session cookies/JWTs, tokens, API keys, and OAuth callback query parameters (`[SC-SEC-006]`).

## Non-goals
- Security headers (`@fastify/helmet`), CORS preflight tightening, Next.js `proxy.ts` nonce CSP/HSTS, Redis-backed API/invitation rate limiting, and updated `docs/security/` documentation (all deferred to **S-009b**).
- Read/filter UI or public REST query endpoint for `AuditEvent` (not in Phase 03 scope).

## Contracts touched (read only these sections)
Master plan §5.1 (`AuditEvent`), §7 (`Authorization & Tenant Isolation`); `docs/database/schema.md` (`AuditEvent` isolation & index); `docs/security/security-model.md` §4, §7.

## Risks to test explicitly
- Transactions: wrapping `orgs.softDelete` and `projects.softDelete` in `$transaction` must preserve exact `403 FORBIDDEN` vs `404 NOT_FOUND` refusal semantics under concurrent role loss or deletion.
- Cascades: purging a soft-deleted org cascades its `AuditEvent` rows cleanly; purging a soft-deleted project retains org-level `AuditEvent` rows (`project.deleted`).
- Log redaction: OAuth callback query parameters (`code`, `state`), cookies, `Authorization: Bearer tp_live_...`, and `plaintextKey` must never leak into Pino JSON output or test artifacts.

## Tests written first
- `apps/api/test/security/tenant-isolation-audit.acceptance.test.ts` covers AC1 (`SC-SEC-001`, `SC-SEC-002`, `SC-SEC-003`, `SC-SEC-004`).
- `apps/api/test/security/audit-and-logging.acceptance.test.ts` covers AC2–AC3 (`SC-SEC-006`, `SC-SEC-007`).

## Done means
Required checks green · claims, security, and test audits show no unfixed findings · `CI Quality Gate` green · the user merged the PR.
