# Phase 06 — Sprint 01: Flaky Test Detection Heuristic Engine

## Sprint Objective

Implement the automated flaky test detection algorithm that analyzes test history and flags unstable tests.

## Dependencies

Phase 05 complete (dashboard and data pipeline).

## Scope

### Granular Implementation Tasks

1. Implement flaky detection algorithm (count status transitions in last N runs).
2. Define flakiness score (0-100 based on transition frequency and recency).
3. Create flakiness recalculation trigger on new run result ingestion.
4. Store flakiness metadata on TestCase model (flakyScore, lastFlakyAt, flakyRunCount).
5. Create GET /api/v1/projects/:projectId/flaky-tests endpoint (sorted by score).
6. Add flaky badge to test case views in the dashboard.
7. Implement configurable sensitivity threshold (per project).

## Expected Files / Areas

`apps/api/src/modules/flaky/`, `apps/web/src/components/FlakyBadge.tsx`

## Testing & Verification

Unit tests for flaky detection algorithm with various test history patterns. Integration tests for end-to-end detection.

## Acceptance Criteria

- [ ] Flaky detection correctly identifies alternating pass/fail patterns.
- [ ] Flakiness score is computed and stored on test cases.
- [ ] Flaky badge appears on flagged tests in the dashboard.
- [ ] Flaky test list endpoint returns sorted results.
- [ ] Detection sensitivity is configurable per project.
- [ ] Detection runs automatically on new result ingestion.

## Risks / Guardrails

False positives on legitimately failing tests; performance of recalculation on large histories; score normalization edge cases.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06, Sprint 01: Flaky Test Detection Heuristic Engine.

OBJECTIVE:
Implement the automated flaky test detection algorithm that analyzes test history and flags unstable tests.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Implement flaky detection algorithm (count status transitions in last N runs).
2. Define flakiness score (0-100 based on transition frequency and recency).
3. Create flakiness recalculation trigger on new run result ingestion.
4. Store flakiness metadata on TestCase model (flakyScore, lastFlakyAt, flakyRunCount).
5. Create GET /api/v1/projects/:projectId/flaky-tests endpoint (sorted by score).
6. Add flaky badge to test case views in the dashboard.
7. Implement configurable sensitivity threshold (per project).

TEST:
Unit tests for flaky detection algorithm with various test history patterns. Integration tests for end-to-end detection.

ACCEPTANCE:
- [ ] Flaky detection correctly identifies alternating pass/fail patterns.
- [ ] Flakiness score is computed and stored on test cases.
- [ ] Flaky badge appears on flagged tests in the dashboard.
- [ ] Flaky test list endpoint returns sorted results.
- [ ] Detection sensitivity is configurable per project.
- [ ] Detection runs automatically on new result ingestion.

GUARDRAILS:
False positives on legitimately failing tests; performance of recalculation on large histories; score normalization edge cases.

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
