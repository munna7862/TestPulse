# Phase 05 — Sprint 04: Run Summary Cards and Run List with Filters

## Sprint Objective

Build the run list view with summary cards, filtering by status/branch/date, and quick navigation to run details.

## Dependencies

P05-S03 live run progress.

## Scope

### Granular Implementation Tasks

1. Create RunSummaryCard component (status badge, branch, commit, pass/fail/skip counts, duration, timestamp).
2. Create RunList component with infinite scroll or pagination.
3. Implement filters: status (passed/failed/running), branch, date range.
4. Add search by commit SHA or branch name.
5. Implement real-time updates (new runs appear at top of list).
6. Create empty state for projects with no runs.
7. Add quick-action buttons (re-run link, view details, compare with previous).

## Expected Files / Areas

`apps/web/src/features/runs/RunList.tsx`, `apps/web/src/features/runs/RunSummaryCard.tsx`

## Testing & Verification

E2E tests for run list rendering, filtering, and pagination. Visual regression tests for card layout.

## Acceptance Criteria

- [ ] Run list displays all runs with summary cards.
- [ ] Filters work correctly (status, branch, date range).
- [ ] New runs appear in real-time at the top.
- [ ] Pagination or infinite scroll works for large run counts.
- [ ] Empty state is displayed when no runs exist.
- [ ] Run cards link to detail view.

## Risks / Guardrails

Infinite scroll performance on thousands of runs; filter state not preserved in URL; missing loading states.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05, Sprint 04: Run Summary Cards and Run List with Filters.

OBJECTIVE:
Build the run list view with summary cards, filtering by status/branch/date, and quick navigation to run details.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create RunSummaryCard component (status badge, branch, commit, pass/fail/skip counts, duration, timestamp).
2. Create RunList component with infinite scroll or pagination.
3. Implement filters: status (passed/failed/running), branch, date range.
4. Add search by commit SHA or branch name.
5. Implement real-time updates (new runs appear at top of list).
6. Create empty state for projects with no runs.
7. Add quick-action buttons (re-run link, view details, compare with previous).

TEST:
E2E tests for run list rendering, filtering, and pagination. Visual regression tests for card layout.

ACCEPTANCE:
- [ ] Run list displays all runs with summary cards.
- [ ] Filters work correctly (status, branch, date range).
- [ ] New runs appear in real-time at the top.
- [ ] Pagination or infinite scroll works for large run counts.
- [ ] Empty state is displayed when no runs exist.
- [ ] Run cards link to detail view.

GUARDRAILS:
Infinite scroll performance on thousands of runs; filter state not preserved in URL; missing loading states.

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
