# Phase 04 — Sprint 01: Database Schema Design and Prisma Migrations

## Sprint Objective

Design and implement the complete database schema for test suites, test cases, test runs, and run results.

## Dependencies

Phase 03 complete (auth, orgs, projects).

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-fullstack-architect`, `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Implement `TestSuite`, `TestCase`, `TestRun`, and `TestResult` exactly as specified in master plan §5, including `projectId` on `TestResult`, `externalRunId`, shard fields, counters, `lastActivityAt`, and flaky fields.
2. Define the enums `RunStatus` (RUNNING, PASSED, FAILED, CANCELLED, TIMED_OUT), `ResultStatus` (PASSED, FAILED, SKIPPED, FLAKY), and `FlakyState` (STABLE, SUSPECTED, FLAKY).
3. Define unique constraints and indexes per master plan §5.2.
4. Extend the tenant-scoped client coverage and its tests to the new models.
5. Create migrations and verify them on a clean database and on a database containing Phase 03 data.
6. Extend the seed script with deterministic runs: multiple branches, sharded runs, retry-flaky results, and alternating pass/fail patterns.
7. Run `EXPLAIN ANALYZE` on the key queries (run list, run detail results, test case history) over ~100k seeded results, and record the plans in `docs/database/schema.md`.
8. Define cascade rules: deleting a project cascades to its runs, cases, and results; deleting a run cascades to its results.

## Expected Files / Areas

`packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/`, `packages/db/prisma/seed.ts`, `docs/database/schema.md`

## Testing & Verification

Run migrations on a clean database. Verify seed data. Tenant-client tests for the new models. Query plans use indexes (no sequential scans on `TestResult` for the key queries).

## Acceptance Criteria

- [ ] All models match master plan §5 field-for-field.
- [ ] Unique constraints prevent duplicate runs per `externalRunId` and duplicate results per `(runId, testCaseId)`.
- [ ] Indexes are defined for the documented query patterns and are used by the query plans.
- [ ] Migrations run successfully on clean and existing databases.
- [ ] The seed script creates realistic, deterministic test data.

## Risks / Guardrails

Missing indexes on high-cardinality columns; schema drift from the master plan; missing `projectId` on child tables (breaks tenant scoping); cascade deletes that lock large tables.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04 — Sprint 01: Database Schema Design and Prisma Migrations.
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-fullstack-architect, role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/04-phase-test-run-ingestion-data-model.md
4. planning/sprints/P04-S01-database-schema-design.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P04_S01.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P04-S01.md and update task.md.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] Acceptance criteria verified.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
