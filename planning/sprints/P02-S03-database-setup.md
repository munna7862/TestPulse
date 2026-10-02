# Phase 02 — Sprint 03: Database, Redis & Job Queue Setup (Prisma + PostgreSQL + Redis + BullMQ)

## Sprint Objective

Set up Prisma with PostgreSQL (Neon), the tenant-scoped client, the Docker-free test database harness, the Redis client, and the BullMQ worker skeleton that later phases build on.

## Dependencies

P02-S02 frontend and backend scaffolding.

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-fullstack-architect`, `role-devops-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Initialize Prisma 7.10 in packages/db (pin `prisma`, `@prisma/client`, and `@prisma/adapter-pg` to the same version; never `prisma@latest`). Use `prisma.config.ts` with `DIRECT_URL` for migrations, and create the runtime client with `@prisma/adapter-pg` on the pooled `DATABASE_URL`.
2. Create skeleton `User` and `Organization` models (fields are extended in Phase 03) and run the initial migration.
3. Implement and export `createTenantDb(ctx)` and `systemDb` (no bare PrismaClient export), with unit tests for scoping, cross-tenant write blocking, and forbidden operations.
4. Build the test database harness: one schema per Vitest worker (`prisma migrate deploy` into it), a truncate helper between test files, and docs for running PostgreSQL locally without Docker (native Windows install or a personal Neon branch).
5. Create the Redis client in `apps/api/src/lib/redis.ts` (ioredis) with connection lifecycle and shutdown handling. It is not placed in `@testpulse/shared`.
6. Create the BullMQ skeleton: a queue registry, typed `enqueue()` with Zod job schemas, worker bootstrap in `worker.ts`, and a `heartbeat` repeatable job.
7. Add the `test:contract` script and a first contract test (enqueue → process → complete) against real Redis.
8. Write a deterministic seed script (fixed Faker seed) for local development.
9. Extend `/health` to report database and Redis status; the worker reports a heartbeat.

## Expected Files / Areas

`packages/db/` (schema, migrations, tenant client, test harness), `apps/api/src/lib/redis.ts`, `apps/api/src/queues/`, `apps/api/src/worker.ts`, `docs/database/local-setup.md`

## Testing & Verification

Run migrations on a clean database; run the tenant-client unit tests; run integration tests in parallel workers to prove schema isolation; run `npm run test:contract` against real Redis; verify that `/health` reports DB and Redis status.

## Acceptance Criteria

- [ ] Prisma migrations run successfully using `DIRECT_URL`.
- [ ] The tenant-scoped client blocks unscoped and cross-tenant operations (unit tested).
- [ ] Integration tests run in parallel with isolated schemas, without Docker.
- [ ] The Redis client connects; a BullMQ job round-trips in the contract test.
- [ ] The API health check includes database and Redis status.

## Risks / Guardrails

Leaked database credentials; running migrations through the pooled connection; Redis connections not closed on shutdown; tests that silently share state across workers.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02 — Sprint 03: Database, Redis & Job Queue Setup (Prisma + PostgreSQL + Redis + BullMQ).
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-fullstack-architect, role-devops-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/02-phase-project-bootstrap-devops.md
4. planning/sprints/P02-S03-database-setup.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P02_S03.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P02-S03.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] Acceptance criteria verified.
- [ ] Feature catalog status and scenario catalog "Automated by" entries updated; tests carry `[SC-*]` IDs in their titles.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
