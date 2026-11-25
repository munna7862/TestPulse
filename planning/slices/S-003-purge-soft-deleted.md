# S-003: Soft-deleted organizations and projects are purged asynchronously

Milestone: M1 First live run · Appetite: 1 session · Risk: high (irreversible hard deletes across tenants; must never delete live tenants or cross tenant boundaries; free-tier catch-up resilience)
Replaces or covers: P03-S03 tasks 2 & 4 (async purge) · FR-ORG-03, FR-ORG-05, FR-OPS-03, FR-SEC-01

## Outcome
After this ships, deleting an organization (`DELETE /api/v1/orgs/:orgId`) or a project (`DELETE /api/v1/projects/:projectId`) enqueues a tenant-scoped purge job (`tenant.purge-org` or `tenant.purge-project`) after the soft-delete commits, and a catch-up-safe periodic sweep (`system.purge-sweep`) cleans up any remaining soft-deleted rows if Redis was down or a worker restarted. Every hard delete runs through `createTenantDb(db, { orgId })`, freeing the deleted org or project slug for reuse while leaving live tenants and cross-tenant rows untouched.

## Acceptance criteria (EARS)
AC1 When `tenant.purge-org` processes `{ orgId }` for a soft-deleted organization (`deletedAt IS NOT NULL`), the processor shall hard-delete the organization via `createTenantDb(db, { orgId })` (cascading its `OrgMember` and `Project` rows), freeing its slug for reuse and leaving other organizations untouched. If the organization is still live (`deletedAt IS NULL`) or already gone, then the processor shall delete nothing and succeed idempotently. (SC-ORG-004)
AC2 When `tenant.purge-project` processes `{ orgId, projectId }` for a soft-deleted project belonging to `orgId`, the processor shall hard-delete only that project via `createTenantDb(db, { orgId })`, freeing its slug in that org while leaving live projects and other orgs untouched. If the project is still live (`deletedAt IS NULL`), belongs to a different org (cross-tenant), or is already gone, then the processor shall delete nothing and succeed idempotently. (SC-ORG-007, SC-ORG-008, SC-SEC-004)
AC3 When `system.purge-sweep` runs, it shall discover soft-deleted organizations and soft-deleted projects in bounded batches (default 50, max 200) and purge each through `createTenantDb`, leaving all live organizations and live projects untouched. Running the sweep repeatedly or concurrently (`Promise.all`) shall be idempotent and never error. (SC-ORG-004, SC-OPS-004)
AC4 When `DELETE /api/v1/orgs/:orgId` or `DELETE /api/v1/projects/:projectId` soft-deletes a tenant and a `QueueClient` is configured, the API shall enqueue `tenant.purge-org` (`jobId: "purge-org_<orgId>"`) or `tenant.purge-project` (`jobId: "purge-project_<projectId>"`) after the DB write succeeds. If enqueueing fails (e.g. Redis outage), the HTTP response shall still return `204` and log the error, relying on `system.purge-sweep` to catch up. (SC-ORG-004)
AC5 When `startWorkers` starts with `redisUrl`, it shall idempotently register the `system.purge-sweep` repeatable job scheduler (`PURGE_SWEEP_SCHEDULER_ID = "system.purge-sweep.every-15m"`, every 15 minutes) alongside `system.heartbeat`, so restarts or Redis flushes never duplicate schedulers. (SC-OPS-004)
AC6 Job payloads for `tenant.purge-org`, `tenant.purge-project`, and `system.purge-sweep` shall be validated by strict Zod schemas in `JOBS` on both enqueue and processing; invalid IDs (empty, malformed, NUL bytes), unknown keys, or out-of-range `batchSize` shall be rejected. (SC-SEC-004)

## Non-goals
- Web UI for org/project switching, dialogs, or onboarding (S-004).
- Undo / grace-period retention before purging (soft delete is immediate 404 + async hard delete in v1).
- Cascading Phase 04+ tables not yet in `schema.prisma` (later tables will inherit `onDelete: Cascade`).

## Contracts touched (read only these sections)
Master plan §4.4 rule 1 (catch-up-safe scheduled jobs, idempotent scheduler registration on startup), §5 (`Organization`, `Project`), ADR-006 layers 3–4 (job bootstrap via `systemDb`, all tenant deletes via `createTenantDb`). `docs/api/rest-api.md` §2 (`DELETE /orgs/:orgId`, `DELETE /projects/:projectId`).

## Risks to test explicitly
- Isolation & safety: `tenant.purge-project` with mismatched `{ orgId, projectId }` must delete nothing; live orgs and live projects (`deletedAt IS NULL`) must never be hard-deleted.
- Concurrency: concurrent `system.purge-sweep` runs (`Promise.all`) must be idempotent without crashing on rows deleted by a parallel sweep.
- Resilience: `DELETE` returning `204` even when `queueClient.enqueue` rejects, followed by `system.purge-sweep` catching up; real-Redis scheduler deduplication across worker restarts (`test:contract`).
- Free-tier profile: runs on the existing `"system"` queue and in-process worker (`RUN_WORKERS_IN_PROCESS=true`), no new infrastructure.

## Tests written first
`apps/api/test/purge/purge.acceptance.test.ts` covers AC1–AC4 and AC6; `apps/api/test/queues.contract.test.ts` covers AC5. SC IDs: SC-ORG-004, SC-ORG-007, SC-ORG-008, SC-OPS-004, SC-SEC-004.

## Done means
Required checks green (`verify` + CI `test:contract` & `e2e`) · claims audit shows no MISSING or STUB · security and test reviews pass · PR merged.
