# Phase 05 — Sprint 05: Individual Test Case Detail View

## Sprint Objective

Build the test case detail page showing the full history timeline, current status, annotations, and quick actions.

## Dependencies

P05-S04 run list.

## Scope

### Granular Implementation Tasks

1. Create TestCaseDetail page (/projects/:projectId/test-cases/:testCaseId).
2. Show test case metadata (name, suite, file path, tags, current status).
3. Display history timeline (last 20 runs with pass/fail/skip status per run).
4. Show latest error details for failing tests.
5. Display duration trend (mini chart of last 20 run durations).
6. Add quick actions (quarantine, annotate, view in source).
7. Link from run results to test case detail and vice versa.
8. Implement breadcrumb navigation (Project > Test Suite > Test Case).

## Expected Files / Areas

`apps/web/src/features/test-cases/TestCaseDetail.tsx`

## Testing & Verification

E2E tests for test case detail rendering, history timeline, and navigation between views.

## Acceptance Criteria

- [ ] Test case detail page renders with all metadata.
- [ ] History timeline shows pass/fail pattern across runs.
- [ ] Error details are displayed for failing tests.
- [ ] Duration trend chart renders correctly.
- [ ] Navigation between runs and test cases works.
- [ ] Breadcrumb navigation is correct.

## Risks / Guardrails

Slow history queries on high-traffic test cases; chart rendering performance; deep-link routing issues.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05, Sprint 05: Individual Test Case Detail View.

OBJECTIVE:
Build the test case detail page showing the full history timeline, current status, annotations, and quick actions.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create TestCaseDetail page (/projects/:projectId/test-cases/:testCaseId).
2. Show test case metadata (name, suite, file path, tags, current status).
3. Display history timeline (last 20 runs with pass/fail/skip status per run).
4. Show latest error details for failing tests.
5. Display duration trend (mini chart of last 20 run durations).
6. Add quick actions (quarantine, annotate, view in source).
7. Link from run results to test case detail and vice versa.
8. Implement breadcrumb navigation (Project > Test Suite > Test Case).

TEST:
E2E tests for test case detail rendering, history timeline, and navigation between views.

ACCEPTANCE:
- [ ] Test case detail page renders with all metadata.
- [ ] History timeline shows pass/fail pattern across runs.
- [ ] Error details are displayed for failing tests.
- [ ] Duration trend chart renders correctly.
- [ ] Navigation between runs and test cases works.
- [ ] Breadcrumb navigation is correct.

GUARDRAILS:
Slow history queries on high-traffic test cases; chart rendering performance; deep-link routing issues.

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
