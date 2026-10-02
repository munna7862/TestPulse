# Phase 08 — Sprint 03: Top Failing, Slowest, and Flakiest Test Views

## Sprint Objective

Build leaderboard-style views for the most problematic tests, helping teams prioritize fixing efforts.

## Dependencies

P08-S02 trend charts.

## Scope

### Granular Implementation Tasks

1. Create TopFailingTests component (table: test name, failure count, last failure, trend).
2. Create SlowestTests component (table: test name, avg duration, p95 duration, trend).
3. Create FlakiestTests component (table: test name, flaky score, transition count, last flaky).
4. Implement configurable time range for all leaderboards.
5. Add click-through from leaderboard to test case detail.
6. Create summary cards for project dashboard (failure rate, slowest test, flakiest test).
7. Implement data refresh on new run completion (via WebSocket event).

## Expected Files / Areas

`apps/web/src/features/analytics/`, `apps/api/src/modules/analytics/`

## Testing & Verification

Integration tests for leaderboard API endpoints. E2E tests for rendering and click-through navigation.

## Acceptance Criteria

- [ ] Top failing tests are accurately ranked.
- [ ] Slowest tests show correct duration metrics.
- [ ] Flakiest tests reflect flaky detection scores.
- [ ] Time range filter changes leaderboard data.
- [ ] Click-through navigates to test case detail.
- [ ] Data refreshes on new run completion.

## Risks / Guardrails

Ranking ties not handled consistently; performance of ranking queries on large test suites; stale cache after new runs.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 08, Sprint 03: Top Failing, Slowest, and Flakiest Test Views.

OBJECTIVE:
Build leaderboard-style views for the most problematic tests, helping teams prioritize fixing efforts.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create TopFailingTests component (table: test name, failure count, last failure, trend).
2. Create SlowestTests component (table: test name, avg duration, p95 duration, trend).
3. Create FlakiestTests component (table: test name, flaky score, transition count, last flaky).
4. Implement configurable time range for all leaderboards.
5. Add click-through from leaderboard to test case detail.
6. Create summary cards for project dashboard (failure rate, slowest test, flakiest test).
7. Implement data refresh on new run completion (via WebSocket event).

TEST:
Integration tests for leaderboard API endpoints. E2E tests for rendering and click-through navigation.

ACCEPTANCE:
- [ ] Top failing tests are accurately ranked.
- [ ] Slowest tests show correct duration metrics.
- [ ] Flakiest tests reflect flaky detection scores.
- [ ] Time range filter changes leaderboard data.
- [ ] Click-through navigates to test case detail.
- [ ] Data refreshes on new run completion.

GUARDRAILS:
Ranking ties not handled consistently; performance of ranking queries on large test suites; stale cache after new runs.

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
