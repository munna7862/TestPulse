# Phase 10 — Sprint 02: Integration and E2E Test Hardening

## Sprint Objective

Fill the test gaps identified in the audit: harden integration tests and add E2E tests for all critical user journeys.

## Dependencies

P10-S01 test coverage audit.

## Scope

### Granular Implementation Tasks

1. Add integration tests for authentication edge cases (expired tokens, invalid credentials).
2. Add integration tests for ingestion edge cases (malformed payloads, concurrent writes).
3. Add integration tests for WebSocket events (connection, room management, broadcasting).
4. Add integration tests for quarantine state transitions.
5. Create E2E test suite for critical journey: sign-up to first test run.
6. Create E2E test suite for critical journey: quarantine lifecycle.
7. Create E2E test suite for critical journey: notification delivery.
8. Set up Playwright test fixtures and page objects.

## Expected Files / Areas

`tests/integration/`, `tests/e2e/`

## Testing & Verification

Run all integration and E2E tests. Verify all critical journeys pass deterministically.

## Acceptance Criteria

- [ ] Integration tests cover all critical edge cases.
- [ ] E2E tests cover sign-up to first test run journey.
- [ ] E2E tests cover quarantine lifecycle.
- [ ] E2E tests cover notification delivery.
- [ ] All tests pass deterministically (no flakiness).
- [ ] Test fixtures are reusable and maintainable.

## Risks / Guardrails

Flaky E2E tests due to timing issues; test data pollution between test runs; overly brittle selectors.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10, Sprint 02: Integration and E2E Test Hardening.

OBJECTIVE:
Fill the test gaps identified in the audit: harden integration tests and add E2E tests for all critical user journeys.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Add integration tests for authentication edge cases (expired tokens, invalid credentials).
2. Add integration tests for ingestion edge cases (malformed payloads, concurrent writes).
3. Add integration tests for WebSocket events (connection, room management, broadcasting).
4. Add integration tests for quarantine state transitions.
5. Create E2E test suite for critical journey: sign-up to first test run.
6. Create E2E test suite for critical journey: quarantine lifecycle.
7. Create E2E test suite for critical journey: notification delivery.
8. Set up Playwright test fixtures and page objects.

TEST:
Run all integration and E2E tests. Verify all critical journeys pass deterministically.

ACCEPTANCE:
- [ ] Integration tests cover all critical edge cases.
- [ ] E2E tests cover sign-up to first test run journey.
- [ ] E2E tests cover quarantine lifecycle.
- [ ] E2E tests cover notification delivery.
- [ ] All tests pass deterministically (no flakiness).
- [ ] Test fixtures are reusable and maintainable.

GUARDRAILS:
Flaky E2E tests due to timing issues; test data pollution between test runs; overly brittle selectors.

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
