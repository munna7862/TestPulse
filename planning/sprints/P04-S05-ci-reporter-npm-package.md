# Phase 04 — Sprint 05: CI Reporter npm Package (Playwright/Vitest)

## Sprint Objective

Build and publish an npm package that CI pipelines install to automatically report test results to TestPulse.

## Dependencies

P04-S02 ingestion API.

## Scope

### Granular Implementation Tasks

1. Create packages/reporter workspace for the npm package.
2. Implement Playwright custom reporter that sends results to TestPulse API.
3. Implement Vitest custom reporter that sends results to TestPulse API.
4. Support configuration via environment variables (TESTPULSE_API_KEY, TESTPULSE_API_URL).
5. Implement result batching (buffer results and send in chunks).
6. Handle API failures gracefully (retry with backoff, never crash the test runner).
7. Add metadata extraction (branch, commit SHA, CI provider auto-detection).
8. Create README with installation and configuration instructions.
9. Prepare for npm publish (package.json, exports, types).

## Expected Files / Areas

`packages/reporter/`, `packages/reporter/README.md`

## Testing & Verification

Unit tests for reporter logic. Integration tests running actual Playwright/Vitest suites with the reporter.

## Acceptance Criteria

- [ ] Playwright reporter sends results to TestPulse API.
- [ ] Vitest reporter sends results to TestPulse API.
- [ ] Configuration via environment variables works.
- [ ] API failures do not crash the test runner.
- [ ] Metadata (branch, commit, CI provider) is auto-detected.
- [ ] Package is publishable to npm.

## Risks / Guardrails

Reporter crashing the test runner on API failure; missing result batching causing rate limits; incorrect metadata detection.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04, Sprint 05: CI Reporter npm Package (Playwright/Vitest).

OBJECTIVE:
Build and publish an npm package that CI pipelines install to automatically report test results to TestPulse.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create packages/reporter workspace for the npm package.
2. Implement Playwright custom reporter that sends results to TestPulse API.
3. Implement Vitest custom reporter that sends results to TestPulse API.
4. Support configuration via environment variables (TESTPULSE_API_KEY, TESTPULSE_API_URL).
5. Implement result batching (buffer results and send in chunks).
6. Handle API failures gracefully (retry with backoff, never crash the test runner).
7. Add metadata extraction (branch, commit SHA, CI provider auto-detection).
8. Create README with installation and configuration instructions.
9. Prepare for npm publish (package.json, exports, types).

TEST:
Unit tests for reporter logic. Integration tests running actual Playwright/Vitest suites with the reporter.

ACCEPTANCE:
- [ ] Playwright reporter sends results to TestPulse API.
- [ ] Vitest reporter sends results to TestPulse API.
- [ ] Configuration via environment variables works.
- [ ] API failures do not crash the test runner.
- [ ] Metadata (branch, commit, CI provider) is auto-detected.
- [ ] Package is publishable to npm.

GUARDRAILS:
Reporter crashing the test runner on API failure; missing result batching causing rate limits; incorrect metadata detection.

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
