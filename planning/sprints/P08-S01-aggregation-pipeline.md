# Phase 08 — Sprint 01: Aggregation Pipeline and Materialized Metrics

## Sprint Objective

Build the background aggregation pipeline that pre-computes daily/weekly metrics for fast dashboard queries.

## Dependencies

Phase 07 complete (notifications and integrations).

## Scope

### Granular Implementation Tasks

1. Design materialized metrics tables (daily_pass_rates, test_stability_scores, run_stats).
2. Create Prisma models for aggregated metrics.
3. Implement daily aggregation background job (BullMQ, runs at midnight UTC).
4. Compute per-project daily metrics: total runs, pass rate, average duration, flaky count.
5. Compute per-test-case stability score over configurable windows (7, 30, 90 days).
6. Create analytics API endpoints with pre-computed data.
7. Implement backfill script for historical data aggregation.
8. Add aggregation job monitoring and failure alerting.

## Expected Files / Areas

`apps/api/src/jobs/aggregation/`, `packages/db/prisma/schema.prisma`

## Testing & Verification

Unit tests for aggregation logic. Integration tests for job execution and data correctness. Performance tests for large datasets.

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
You are the implementation agent for TestPulse, Phase 08, Sprint 01: Aggregation Pipeline and Materialized Metrics.

OBJECTIVE:
Build the background aggregation pipeline that pre-computes daily/weekly metrics for fast dashboard queries.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Design materialized metrics tables (daily_pass_rates, test_stability_scores, run_stats).
2. Create Prisma models for aggregated metrics.
3. Implement daily aggregation background job (BullMQ, runs at midnight UTC).
4. Compute per-project daily metrics: total runs, pass rate, average duration, flaky count.
5. Compute per-test-case stability score over configurable windows (7, 30, 90 days).
6. Create analytics API endpoints with pre-computed data.
7. Implement backfill script for historical data aggregation.
8. Add aggregation job monitoring and failure alerting.

TEST:
Unit tests for aggregation logic. Integration tests for job execution and data correctness. Performance tests for large datasets.

ACCEPTANCE:
- [ ] Daily aggregation job runs and computes correct metrics.
- [ ] Pre-computed metrics match raw data calculations.
- [ ] Analytics API returns data within 100ms.
- [ ] Backfill script processes historical data correctly.
- [ ] Job failures are monitored and alerted.
- [ ] Aggregation handles empty days gracefully.

GUARDRAILS:
Aggregation job timeout on large datasets; metric drift from raw data; timezone issues in daily boundaries.

At completion:
- Run the relevant verification commands.
- Report changed files.
- Report tests executed and results.
- Report known limitations.
- Do not suppress or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Tests added or updated for changed behavior.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Relevant tests pass.
- [ ] Build passes when applicable.
- [ ] Acceptance criteria verified.
- [ ] Git diff reviewed.
- [ ] Documentation updated when behavior or architecture changed.
- [ ] Sprint can be handed to the next sprint without hidden manual steps.
