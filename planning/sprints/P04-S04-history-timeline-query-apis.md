# Phase 04 — Sprint 04: History Timeline and Query APIs

## Sprint Objective

Build the query APIs that power the dashboard: test run history, test case history timeline, and filtered views.

## Dependencies

P04-S03 test case deduplication.

## Scope

### Granular Implementation Tasks

1. Create GET /api/v1/projects/:projectId/runs endpoint (list runs with filters: status, branch, date range).
2. Create GET /api/v1/runs/:runId endpoint (run detail with all results).
3. Create GET /api/v1/test-cases/:testCaseId/history endpoint (last N runs for a test case).
4. Implement cursor-based pagination for all list endpoints.
5. Add sorting options (newest first, duration, status).
6. Implement text search across test case names.
7. Optimize queries with appropriate indexes and query plans.

## Expected Files / Areas

`apps/api/src/modules/runs/`, `apps/api/src/modules/test-cases/`

## Testing & Verification

Integration tests for all query endpoints with various filter combinations. Performance tests for pagination on large datasets.

## Acceptance Criteria

- [ ] Run list supports status, branch, and date range filters.
- [ ] Run detail includes all results with error information.
- [ ] Test case history shows the last N runs with status timeline.
- [ ] Cursor-based pagination works correctly.
- [ ] Text search finds test cases by name.
- [ ] Query performance is acceptable on 100K+ results.

## Risks / Guardrails

N+1 query patterns; missing pagination leading to unbounded responses; slow full-text search.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04, Sprint 04: History Timeline and Query APIs.

OBJECTIVE:
Build the query APIs that power the dashboard: test run history, test case history timeline, and filtered views.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create GET /api/v1/projects/:projectId/runs endpoint (list runs with filters: status, branch, date range).
2. Create GET /api/v1/runs/:runId endpoint (run detail with all results).
3. Create GET /api/v1/test-cases/:testCaseId/history endpoint (last N runs for a test case).
4. Implement cursor-based pagination for all list endpoints.
5. Add sorting options (newest first, duration, status).
6. Implement text search across test case names.
7. Optimize queries with appropriate indexes and query plans.

TEST:
Integration tests for all query endpoints with various filter combinations. Performance tests for pagination on large datasets.

ACCEPTANCE:
- [ ] Run list supports status, branch, and date range filters.
- [ ] Run detail includes all results with error information.
- [ ] Test case history shows the last N runs with status timeline.
- [ ] Cursor-based pagination works correctly.
- [ ] Text search finds test cases by name.
- [ ] Query performance is acceptable on 100K+ results.

GUARDRAILS:
N+1 query patterns; missing pagination leading to unbounded responses; slow full-text search.

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
