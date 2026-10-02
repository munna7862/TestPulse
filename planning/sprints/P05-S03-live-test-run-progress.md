# Phase 05 — Sprint 03: Live Test Run Progress View

## Sprint Objective

Build the real-time test run progress component that shows results streaming in as tests complete.

## Dependencies

P05-S02 Socket.IO client.

## Scope

### Granular Implementation Tasks

1. Create LiveRunProgress component with streaming result list.
2. Show progress bar (completed / total tests) with real-time updates.
3. Display per-test results as they arrive (pass/fail/skip icons, name, duration).
4. Implement expandable error details for failed tests (error message, stack trace).
5. Add copy-to-clipboard for error messages and stack traces.
6. Show run duration timer (elapsed time, live counting).
7. Implement visual transitions for new results (slide-in animation).
8. Handle run completion event (transition from live to static view).

## Expected Files / Areas

`apps/web/src/features/runs/LiveRunProgress.tsx`

## Testing & Verification

E2E tests: trigger a test run ingestion, verify results appear in real-time on the dashboard.

## Acceptance Criteria

- [ ] Results stream live into the progress view.
- [ ] Progress bar updates in real-time.
- [ ] Failed tests show expandable error details.
- [ ] Copy-to-clipboard works for errors.
- [ ] Run completion transitions smoothly to static view.
- [ ] UI remains responsive during high-throughput streaming.

## Risks / Guardrails

UI jank during rapid result updates; memory growth on long runs; missing error boundary for WebSocket failures.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05, Sprint 03: Live Test Run Progress View.

OBJECTIVE:
Build the real-time test run progress component that shows results streaming in as tests complete.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create LiveRunProgress component with streaming result list.
2. Show progress bar (completed / total tests) with real-time updates.
3. Display per-test results as they arrive (pass/fail/skip icons, name, duration).
4. Implement expandable error details for failed tests (error message, stack trace).
5. Add copy-to-clipboard for error messages and stack traces.
6. Show run duration timer (elapsed time, live counting).
7. Implement visual transitions for new results (slide-in animation).
8. Handle run completion event (transition from live to static view).

TEST:
E2E tests: trigger a test run ingestion, verify results appear in real-time on the dashboard.

ACCEPTANCE:
- [ ] Results stream live into the progress view.
- [ ] Progress bar updates in real-time.
- [ ] Failed tests show expandable error details.
- [ ] Copy-to-clipboard works for errors.
- [ ] Run completion transitions smoothly to static view.
- [ ] UI remains responsive during high-throughput streaming.

GUARDRAILS:
UI jank during rapid result updates; memory growth on long runs; missing error boundary for WebSocket failures.

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
