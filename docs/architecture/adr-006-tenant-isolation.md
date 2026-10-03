# ADR-006: Tenant Isolation Enforcement (No RLS in v1)

## Status
Accepted (P01-S04, 2026-10). Closes Open Decision Q4. Implements master plan D-04 and §7.2.

## Context
Cross-tenant leakage is the most damaging failure a multi-tenant SaaS can have. TestPulse data is mostly project-scoped and high-volume (`TestResult`). A single missed `WHERE projectId = …` would leak another customer's test names, stack traces, or comments.

## Decision
Isolation is enforced in **five layers**. PostgreSQL Row-Level Security is **not** used in v1.

| # | Layer | Mechanism | Verified by |
| :--- | :--- | :--- | :--- |
| 1 | Data model | Every tenant-owned row carries `projectId` and/or `orgId` (no join needed to scope) | Schema review (P04-S01) |
| 2 | Routing | Resources nested under `/orgs/:orgId` or `/projects/:projectId`. One preHandler `resolveTenantContext()` derives `{ orgId, projectId, role }` from the authenticated user, or from the API key | SC-SEC-001/002 |
| 3 | Data access | Apps use only `createTenantDb(ctx)`. It injects the tenant filter on reads and bulk writes, stamps it on creates, rejects cross-tenant writes, and forbids `findUnique`/`update`/`delete`/`upsert` by bare ID. `systemDb` is limited to the identity tables, API-key lookup, migrations, and job bootstrap. `@prisma/client` imports outside `packages/db` are lint errors | SC-SEC-004, lint |
| 4 | Real-time & jobs | Socket room joins re-check membership; eviction on membership changes. Job data carries `orgId`/`projectId` and processors open a tenant client | SC-RT-004, SC-RT-006 |
| 5 | Tests | A table-driven isolation suite covers **every route** (cross-tenant → 404, role → 403), with a meta-test that fails when a route is missing from the table | SC-SEC-003 |

**Response policy:** cross-tenant → `404 NOT_FOUND` (existence is not disclosed). Insufficient role within one's own org → `403 FORBIDDEN`. Plan limits → `403 PLAN_LIMIT_REACHED`.

**Raw SQL** (bulk upserts, analytics) must include the tenant predicate explicitly and is reviewed by the Security Engineer persona. Each raw query gets a dedicated isolation test.

## Why not RLS (Q4)
- Prisma with a pooled connection requires per-transaction `SET LOCAL app.current_project = …` for every query. That adds latency and complexity to the hottest path (ingestion), and it is easy to misconfigure with connection pooling.
- Layers 2–5 give equivalent protection for the v1 threat model, and they are testable in CI.
- **Revisit after launch** if raw-SQL surface area grows, or if an enterprise customer requires defense in depth at the database level. RLS can be added without changing the API.

## Consequences
- **Positive:** a simple, fast data path; isolation is provable in CI; one resolver shared by REST, sockets, and jobs.
- **Negative / trade-offs:** correctness depends on application code; `systemDb` and raw SQL are sharp edges.
- **Mitigation:** the lint ban, a code-review checklist (Security Engineer skill), the meta-test, and audits in P03-S06 and P10-S04.

## Amendment 1 (2026-10-03, S-002): membership lookups keyed by the authenticated user

Layer 3 limits `systemDb` to the identity tables, API-key lookup, migrations and job bootstrap. Two reads cannot use
a tenant client because the tenant is not known until the read returns:

- **Project route resolution** (`resolveProject` in `apps/api/src/plugins/tenant-context.ts`): `project → org →
  membership` in one `OrgMember` query, before any `orgId` is known.
- **"My organizations"** (`OrgService.listForUser`, `GET /orgs`): the caller's memberships across orgs.

Both are added to the `systemDb` list, under these conditions:

- The query filters on the authenticated user's `userId`.
- It returns only that user's membership rows, plus the tenant ids and fields the caller may see.
- Soft-deleted tenants are excluded.
- The routes that use it are covered by the table-driven isolation suite.

Everything after resolution goes through `createTenantDb`.

The org-row lock in project creation (`SELECT "planTier" … FOR UPDATE`, `ProjectService.create`) is raw SQL with
an explicit `id = ctx.orgId` predicate. Its isolation test is `apps/api/test/projects/create-lock.int.test.ts`.
