# Phase 08 — Sprint 02: Pass Rate and Duration Trend Charts

## Sprint Objective

Build interactive trend charts for pass rate and test duration over time, powered by the aggregation pipeline.

## Dependencies

P08-S01 aggregation pipeline.

## Scope

### Granular Implementation Tasks

1. Create PassRateTrendChart component (line chart, daily/weekly/monthly granularity).
2. Create DurationTrendChart component (average and p95 duration over time).
3. Implement date range selector (last 7 days, 30 days, 90 days, custom).
4. Add branch filter to charts (compare main vs feature branches).
5. Implement chart interactivity (tooltips, zoom, click-through to specific day).
6. Create project overview dashboard card with key metrics summary.
7. Add chart loading skeletons and error states.

## Expected Files / Areas

`apps/web/src/features/analytics/`

## Testing & Verification

E2E tests for chart rendering with real data. Visual regression tests for chart appearance.

## Acceptance Criteria

- [ ] Pass rate trend chart renders correctly with real data.
- [ ] Duration trend chart shows average and p95.
- [ ] Date range selector changes chart data.
- [ ] Branch filter works correctly.
- [ ] Tooltips display detailed information.
- [ ] Loading and error states are handled.

## Risks / Guardrails

Chart performance with large datasets; inconsistent chart rendering across browsers; timezone mismatch in date labels.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 08, Sprint 02: Pass Rate and Duration Trend Charts.

OBJECTIVE:
Build interactive trend charts for pass rate and test duration over time, powered by the aggregation pipeline.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create PassRateTrendChart component (line chart, daily/weekly/monthly granularity).
2. Create DurationTrendChart component (average and p95 duration over time).
3. Implement date range selector (last 7 days, 30 days, 90 days, custom).
4. Add branch filter to charts (compare main vs feature branches).
5. Implement chart interactivity (tooltips, zoom, click-through to specific day).
6. Create project overview dashboard card with key metrics summary.
7. Add chart loading skeletons and error states.

TEST:
E2E tests for chart rendering with real data. Visual regression tests for chart appearance.

ACCEPTANCE:
- [ ] Pass rate trend chart renders correctly with real data.
- [ ] Duration trend chart shows average and p95.
- [ ] Date range selector changes chart data.
- [ ] Branch filter works correctly.
- [ ] Tooltips display detailed information.
- [ ] Loading and error states are handled.

GUARDRAILS:
Chart performance with large datasets; inconsistent chart rendering across browsers; timezone mismatch in date labels.

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
