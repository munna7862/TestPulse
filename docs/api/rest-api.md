# REST API Conventions & Route Map (v1)

> **Sprint:** P01-S03 (design); every API sprint keeps it current. The minimum role for each route is defined here and in [`docs/security/rbac-matrix.md`](../security/rbac-matrix.md). Ingestion routes are in [`ingestion.md`](ingestion.md). Generated OpenAPI (P11-S03) is the source for the public reference.

## 1. Conventions

| Topic | Rule |
| :--- | :--- |
| Base path | `/api/v1`. The browser reaches it on the web origin (free-profile rewrite) or on `api.<domain>` (paid profile) |
| Auth | Session cookies (`tp_access`, `tp_refresh`), `HttpOnly; Secure; SameSite=Lax`. Cookie-authenticated mutations require a matching `Origin` (CSRF) |
| Tenancy | Resource routes are nested under `/orgs/:orgId` or `/projects/:projectId`. One preHandler resolves `tenantContext`. Cross-tenant → **404**; insufficient role → **403** |
| IDs | Opaque string IDs (cuid2/uuidv7, chosen in P02-S03). Slugs are only used by the web app to resolve IDs |
| Validation | Zod schemas from `@testpulse/shared` via `fastify-type-provider-zod` for params, query, body, **and** responses |
| Envelope | `{ success: true, data, meta? }` / `{ success: false, error: { code, message, details? } }` |
| Pagination | Cursor-based: `?limit=1..100&cursor=<opaque>`; response `meta: { cursor: string \| null, limit }`; stable ordering with an `id` tiebreaker |
| Filtering | Query params named after fields (`status`, `branch`, `from`, `to`, `q`); comma-separated multi-values |
| Timestamps | ISO-8601 UTC strings |
| Errors | `VALIDATION_ERROR` 400 · `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `PLAN_LIMIT_REACHED` 403 · `RATE_LIMITED` 429 · `QUOTA_EXCEEDED` 429 · `INTERNAL` 500 |
| Request ID | Every response carries `x-request-id`; errors include it so users can quote it |
| Versioning | Breaking changes → `/api/v2`. Additive changes are allowed in v1 |

## 2. Route map

Roles: **A** = any authenticated user · **V** Viewer+ · **M** Member+ · **Ad** Admin+ · **O** Owner · **K** API key (ingest only). "Sprint" is where each route is implemented.

### Auth & account (no tenant)

| Method & path | Role | Purpose | Sprint |
| :--- | :--- | :--- | :--- |
| `POST /auth/register` | public | Register (generic response) | P03-S01 |
| `POST /auth/verify-email` | public | Verify an email token | P03-S01 |
| `POST /auth/resend-verification` | public | Resend verification (generic) | P03-S01 |
| `POST /auth/login` | public | Log in → cookies | P03-S01 |
| `POST /auth/refresh` | refresh cookie | Rotate tokens | P03-S01 |
| `POST /auth/logout` · `POST /auth/logout-all` | A | End the session(s) | P03-S01 |
| `POST /auth/password/forgot` · `POST /auth/password/reset` | public | Password reset | P03-S01 |
| `GET /auth/oauth/:provider/start` · `GET /auth/oauth/:provider/callback` | public | OAuth (google, github) | P03-S02 |
| `GET /auth/me` | A | Current user, memberships, preferences | P03-S01 |
| `PATCH /me` | A | Profile, theme preference | P03-S01, P09-S02 |
| `GET /me/sessions` · `DELETE /me/sessions/:sessionId` | A | Manage sessions | P03-S01 |
| `GET /me/oauth-accounts` · `POST /me/oauth-accounts/:provider/link` · `DELETE /me/oauth-accounts/:id` | A | Linked accounts | P03-S02 |
| `POST /realtime/ticket` | A | Single-use socket ticket (60 s) | P05-S01 |
| `GET /notifications` · `POST /notifications/read` · `POST /notifications/read-all` | A (own only) | Notification center | P07-S01 |
| `GET /me/notification-preferences` · `PUT /me/notification-preferences` | A | Preferences | P07-S03 |
| `GET /unsubscribe?token=` · `POST /unsubscribe` | public (signed token) | Email unsubscribe | P07-S02 |

### Organizations

| Method & path | Role | Purpose | Sprint |
| :--- | :--- | :--- | :--- |
| `POST /orgs` | A (verified) | Create org (caller = Owner) | P03-S03 |
| `GET /orgs` | A | My orgs (`?slug=` resolves a slug) | P03-S03 |
| `GET /orgs/:orgId` | V | Org details | P03-S03 |
| `PATCH /orgs/:orgId` | Ad | Update org | P03-S03 |
| `DELETE /orgs/:orgId` | O | Soft-delete + async purge | P03-S03 |
| `POST /orgs/:orgId/transfer-ownership` | O | Transfer to an existing Admin | P03-S03 |
| `GET /orgs/:orgId/members` | V | List members | P03-S03 |
| `PATCH /orgs/:orgId/members/:userId` | Ad | Change role (not Owner) | P03-S04 |
| `DELETE /orgs/:orgId/members/:userId` | Ad (or self) | Remove member / leave | P03-S04 |
| `GET /orgs/:orgId/invitations` · `POST /orgs/:orgId/invitations` | Ad | List / invite | P03-S04 |
| `POST /orgs/:orgId/invitations/:id/resend` · `DELETE /orgs/:orgId/invitations/:id` | Ad | Resend / revoke | P03-S04 |
| `POST /invitations/accept` | A (verified, email must match) | Accept an invitation | P03-S04 |
| `GET /orgs/:orgId/usage` | V | Plan, quotas, usage | P04-S06 |
| `GET /orgs/:orgId/audit-events` | Ad | Audit log | P03-S06 |
| `GET /orgs/:orgId/projects` · `POST /orgs/:orgId/projects` | V / Ad | List / create project (`?slug=`) | P03-S03 |

### Projects

| Method & path | Role | Purpose | Sprint |
| :--- | :--- | :--- | :--- |
| `GET /projects/:projectId` | V | Project + settings | P03-S03 |
| `PATCH /projects/:projectId` | Ad | Update name and settings (SLA, retention, flaky, branches) | P03-S03, P06 |
| `DELETE /projects/:projectId` | Ad | Delete (async purge) | P03-S03 |
| `GET/POST /projects/:projectId/api-keys` · `DELETE …/api-keys/:keyId` | Ad | API keys | P03-S05 |
| `GET /projects/:projectId/runs` | V | Run list (filters) | P04-S04 |
| `GET /projects/:projectId/runs/:runId` | V | Run summary (also `?runNumber=`) | P04-S04 |
| `GET /projects/:projectId/runs/:runId/results` | V | Results (no stack traces) | P04-S04 |
| `GET /projects/:projectId/runs/:runId/results/:resultId` | V | Result detail with stack trace | P04-S04 |
| `GET /projects/:projectId/runs/:runId/compare` | V | Diff vs. previous run on the same branch | P05-S04 |
| `GET /projects/:projectId/test-cases` | V | List/search (`q`, `flakyState`, `quarantined`, `label`, `suite`) | P04-S03 |
| `GET /projects/:projectId/test-cases/:testCaseId` | V | Detail + flaky reasons | P04-S04, P06-S01 |
| `GET /projects/:projectId/test-cases/:testCaseId/history` | V | Last N results | P04-S04 |
| `PUT /projects/:projectId/test-cases/:testCaseId/labels` | M | Set labels | P06-S03 |
| `GET /projects/:projectId/labels` | V | Label autocomplete | P06-S03 |
| `GET /projects/:projectId/flaky-tests` | V | Flaky list | P06-S01 |
| `POST /projects/:projectId/test-cases/:testCaseId/quarantine` | M | Quarantine a test | P06-S02 |
| `GET /projects/:projectId/quarantines` | V | List (filters) | P06-S04 |
| `GET /projects/:projectId/quarantines/:quarantineId` | V | Detail + transitions | P06-S02 |
| `PATCH /projects/:projectId/quarantines/:quarantineId` | M | Transition / assign | P06-S02 |
| `POST /projects/:projectId/quarantines/bulk` | M | Bulk transition/assign (≤ 100; per-item results) | P06-S04 |
| `GET /projects/:projectId/quarantines/export.csv` | V | CSV export | P06-S04 |
| `GET /projects/:projectId/quarantines/metrics` | V | MTTR, counts | P06-S05 |
| `GET/POST /projects/:projectId/test-cases/:testCaseId/annotations` | V / M | Comments | P06-S03 |
| `PATCH/DELETE …/annotations/:annotationId` | author (M) / Ad | Edit/delete | P06-S03 |
| `GET/PUT /projects/:projectId/notification-defaults` | V / Ad | Project defaults | P07-S03 |
| `GET/POST /projects/:projectId/webhooks` · `PATCH/DELETE …/webhooks/:id` | Ad | Webhooks | P07-S05 |
| `POST …/webhooks/:id/rotate-secret` · `POST …/webhooks/:id/test` | Ad | Secret rotation / test event | P07-S05 |
| `GET …/webhooks/:id/deliveries` · `POST …/deliveries/:deliveryId/redeliver` | Ad | Delivery log | P07-S05 |
| `GET /projects/:projectId/analytics/{pass-rate,duration,runs,leaderboards,mttr,branches}` | V | Analytics (pre-computed) | P08 |
| `GET /projects/:projectId/analytics/export?format=csv\|json&view=…` | V | Export (streamed, capped) | P08-S04 |

### Ingestion (API key)

See [`ingestion.md`](ingestion.md): `POST /ingest/runs`, `POST /ingest/runs/:runId/results`, `POST /ingest/runs/:runId/complete`, `GET /ingest/quarantined-tests`, `GET /ingest/runs/:runId/summary`. Role **K** only; session cookies are ignored on these routes.

### Operational

| Method & path | Role | Purpose |
| :--- | :--- | :--- |
| `GET /health` | public | Liveness + DB/Redis status (no secrets, no version details beyond the commit short SHA) |
| `GET /docs` (OpenAPI UI) | public in staging; restricted in production | API reference (P11-S03 hosts the public version) |
