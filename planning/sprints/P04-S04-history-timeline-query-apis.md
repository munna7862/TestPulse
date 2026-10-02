# Phase 04 — Sprint 04: History Timeline and Query APIs

## Sprint Objective

Build the query APIs that power the dashboard: test run history, test case history timeline, and filtered views.

## Dependencies

P04-S03 test case deduplication.

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. `GET /api/v1/projects/:projectId/runs`: filters for status, branch, and date range; cursor pagination.
2. `GET /api/v1/projects/:projectId/runs/:runId`: run summary and counters.
3. `GET /api/v1/projects/:projectId/runs/:runId/results`: paginated, status filter, failures first. Stack traces are omitted from list items.
4. `GET /api/v1/projects/:projectId/runs/:runId/results/:resultId`: full error message and stack trace.
5. `GET /api/v1/projects/:projectId/test-cases/:testCaseId` and `/history` (last N results, default 20, max 100, optional branch filter).
6. A shared cursor pagination utility (opaque cursor, stable ordering with an `id` tiebreaker).
7. Sorting options (newest first, duration, status).
8. Test case title search (decide between `pg_trgm` GIN and bounded ILIKE, and document the choice).
9. Verify query plans on 100k+ results.

## Expected Files / Areas

`apps/api/src/modules/runs/`, `apps/api/src/modules/test-cases/`, `packages/shared/src/schemas/`, `docs/api/rest-api.md`

## Testing & Verification

Integration tests for every endpoint and filter combination, including cross-tenant 404s. Performance tests for pagination on large datasets.

## Acceptance Criteria

- [ ] The run list supports status, branch, and date range filters.
- [ ] Run detail and results endpoints return error details only where intended.
- [ ] Test case history shows the last N results with a status timeline.
- [ ] Cursor-based pagination is stable under concurrent inserts.
- [ ] Text search finds test cases by title.
- [ ] Every route is nested under the project and covered by the isolation suite.
- [ ] Query performance meets master plan §10 on 100k+ results.

## Risks / Guardrails

N+1 query patterns; unbounded responses; slow full-text search; returning stack traces in list endpoints (payload bloat).

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04 — Sprint 04: History Timeline and Query APIs.
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/04-phase-test-run-ingestion-data-model.md
4. planning/sprints/P04-S04-history-timeline-query-apis.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P04_S04.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P04-S04.md and update task.md.
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
