# Phase 10 — Sprint 01: Test Coverage Audit and Gap Analysis

## Sprint Objective

Audit existing test coverage, identify gaps, and create a prioritized plan for coverage improvement.

## Dependencies

Phase 09 complete (UX polish and accessibility).

## Scope

### Granular Implementation Tasks

1. Generate test coverage report across all workspaces.
2. Identify untested critical paths (auth, ingestion, WebSocket, quarantine).
3. Create test gap matrix (feature vs test type: unit/integration/E2E).
4. Prioritize gaps by risk (security-critical > core-business > UI).
5. Create test improvement plan with effort estimates.
6. Set target coverage thresholds (80% unit, 60% integration, critical journeys E2E).
7. Add coverage reporting to CI pipeline.

## Expected Files / Areas

`docs/test-coverage-audit.md`, `.github/workflows/ci.yml`

## Testing & Verification

Run coverage report. Verify coverage thresholds in CI. Review gap analysis.

## Acceptance Criteria

- [ ] Coverage report is generated for all workspaces.
- [ ] Critical path gaps are identified and prioritized.
- [ ] Test improvement plan has effort estimates.
- [ ] Coverage reporting is integrated into CI.
- [ ] Target thresholds are defined and documented.

## Risks / Guardrails

Chasing coverage numbers over meaningful tests; missing edge cases despite high line coverage.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10, Sprint 01: Test Coverage Audit and Gap Analysis.

OBJECTIVE:
Audit existing test coverage, identify gaps, and create a prioritized plan for coverage improvement.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Generate test coverage report across all workspaces.
2. Identify untested critical paths (auth, ingestion, WebSocket, quarantine).
3. Create test gap matrix (feature vs test type: unit/integration/E2E).
4. Prioritize gaps by risk (security-critical > core-business > UI).
5. Create test improvement plan with effort estimates.
6. Set target coverage thresholds (80% unit, 60% integration, critical journeys E2E).
7. Add coverage reporting to CI pipeline.

TEST:
Run coverage report. Verify coverage thresholds in CI. Review gap analysis.

ACCEPTANCE:
- [ ] Coverage report is generated for all workspaces.
- [ ] Critical path gaps are identified and prioritized.
- [ ] Test improvement plan has effort estimates.
- [ ] Coverage reporting is integrated into CI.
- [ ] Target thresholds are defined and documented.

GUARDRAILS:
Chasing coverage numbers over meaningful tests; missing edge cases despite high line coverage.

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
