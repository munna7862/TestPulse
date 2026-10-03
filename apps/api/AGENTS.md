# apps/api rules

Fastify 5: `src/server.ts` (REST + Socket.IO gateway) and `src/worker.ts` (BullMQ workers). Root rules in `/AGENTS.md`.

## Tenancy and authorization
- User-facing resources live under `/api/v1/orgs/:orgId/...` or `/api/v1/projects/:projectId/...`.
- Handlers read tenant IDs only from `request.tenantContext`, never from the body or query.
- Cross-tenant access returns **404** (never reveal existence). A low role inside your own tenant returns **403**.
- Roles (`Owner`, `Admin`, `Member`, `Viewer`) are org-level and apply to every project in the org (master plan §7).
- API keys are project-scoped and may call only `/api/v1/ingest/*` for their own project.
- Every new route, socket room or job gets a cross-tenant (404) and a role (403) test.
- Any read-then-write on security state (tokens, sessions, invitations, quotas) must be atomic
  (conditional `updateMany` + count check) and gets a `Promise.all` concurrency test.

## Real-time
- Handlers and workers never hold a Socket.IO server reference and never call `io.emit`.
- Flow: DB mutation **commits** → `RealtimePublisher.emit()` (Zod-validated, wraps `@socket.io/redis-emitter`)
  → Redis → `@socket.io/redis-adapter` on each gateway → authorized `project:{id}` / `user:{id}` rooms.
- Forbidden: gateways subscribing to a custom Redis channel and re-broadcasting (delivers N times).
- Payloads are lean (IDs, status, counters) in the envelope `{ eventId, type, version, occurredAt, orgId, projectId?, payload }`.

## Security hygiene
- pino `redact` covers `authorization`, `cookie`, `set-cookie`, API keys, tokens, passwords and OAuth `code`/`state`.
- Auth responses are generic in body **and** timing (ADR-005 §9). Rate limits follow docs/security/security-model.md §5.
- CI-provided data (test titles, errors, stack traces) is untrusted: cap sizes, never treat it as HTML.
- Webhook secrets are encrypted at rest; everything else secret is stored as a hash.

## Free-tier profile
Same-origin `/api` proxy, ticket-based socket auth, `RUN_WORKERS_IN_PROCESS`, catch-up-safe scheduled jobs.
Code must work in free and paid profiles through configuration only.
