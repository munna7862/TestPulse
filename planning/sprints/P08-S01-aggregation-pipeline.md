# Phase 08 — Sprint 01: Aggregation Pipeline and Daily Metric Tables

## Sprint Objective

Build the background aggregation pipeline that pre-computes daily/weekly metrics for fast dashboard queries.

## Dependencies

Phase 07 complete (notifications and integrations).

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-fullstack-architect`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Add `ProjectDailyMetric` and `TestCaseDailyMetric` models (UTC dates) per master plan §5.
2. Incremental aggregation: on run completion, upsert today's rows; a nightly reconciliation job (00:15 UTC) recomputes the previous day.
3. Per-project daily metrics: runs, run pass rate, test pass rate, average and p95 duration (computed in SQL), flaky count, failure count.
4. Per-test-case stability score over 7/30/90-day windows from the daily metrics.
5. Analytics endpoints under `/api/v1/projects/:projectId/analytics/*` that read pre-computed data.
6. An idempotent, chunked backfill command for historical data.
7. Aggregates are retained beyond raw-data retention (up to 365 days).
8. Job monitoring and failure alerting (Sentry cron monitor).

## Expected Files / Areas

`apps/api/src/jobs/aggregation/`, `apps/api/src/modules/analytics/`, `packages/db/prisma/schema.prisma`

## Testing & Verification

Unit tests for aggregation math. Integration tests comparing pre-computed metrics with raw-data calculations on seeded data. Performance tests on 1M+ results.

## Acceptance Criteria

- [ ] Daily aggregation job runs and computes correct metrics.
- [ ] Pre-computed metrics match raw data calculations.
- [ ] Analytics API returns data within 100ms.
- [ ] Backfill script processes historical data correctly.
- [ ] Job failures are monitored and alerted.
- [ ] Aggregation handles empty days gracefully.

## Risks / Guardrails

Aggregation job timeout on large datasets; metric drift from raw data; timezone issues in daily boundaries.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 08 — Sprint 01: Aggregation Pipeline and Daily Metric Tables.
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-fullstack-architect, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/08-phase-analytics-reporting.md
4. planning/sprints/P08-S01-aggregation-pipeline.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P08_S01.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P08-S01.md and update task.md.
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
