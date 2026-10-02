# Phase 09 — Sprint 04: Error, Empty, and Loading State Handling

## Sprint Objective

Ensure every view has thoughtful error, empty, and loading states with clear CTAs and recovery options.

## Dependencies

P09-S03 micro-animations.

## Scope

### Granular Implementation Tasks

1. Create reusable ErrorBoundary component with retry action.
2. Create EmptyState component with illustration and CTA.
3. Define empty states for: no projects, no runs, no test cases, no quarantines, no notifications.
4. Create API error handling with user-friendly messages.
5. Implement WebSocket disconnection banner with reconnect button.
6. Add 404 page for invalid routes.
7. Create maintenance mode page.
8. Implement graceful degradation when backend is unreachable.

## Expected Files / Areas

`apps/web/src/components/states/`, `apps/web/src/app/error.tsx`

## Testing & Verification

E2E tests for error states (mock API failures). Tests for empty states on fresh accounts. Disconnection recovery tests.

## Acceptance Criteria

- [ ] Error boundaries catch and display all unhandled errors.
- [ ] Empty states show helpful CTAs for every major view.
- [ ] API errors display user-friendly messages.
- [ ] WebSocket disconnection shows a recovery banner.
- [ ] 404 page handles invalid routes.
- [ ] Application degrades gracefully when backend is down.

## Risks / Guardrails

Error boundary swallowing important errors; empty state CTAs pointing to wrong actions; error messages leaking internal details.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 09, Sprint 04: Error, Empty, and Loading State Handling.

OBJECTIVE:
Ensure every view has thoughtful error, empty, and loading states with clear CTAs and recovery options.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create reusable ErrorBoundary component with retry action.
2. Create EmptyState component with illustration and CTA.
3. Define empty states for: no projects, no runs, no test cases, no quarantines, no notifications.
4. Create API error handling with user-friendly messages.
5. Implement WebSocket disconnection banner with reconnect button.
6. Add 404 page for invalid routes.
7. Create maintenance mode page.
8. Implement graceful degradation when backend is unreachable.

TEST:
E2E tests for error states (mock API failures). Tests for empty states on fresh accounts. Disconnection recovery tests.

ACCEPTANCE:
- [ ] Error boundaries catch and display all unhandled errors.
- [ ] Empty states show helpful CTAs for every major view.
- [ ] API errors display user-friendly messages.
- [ ] WebSocket disconnection shows a recovery banner.
- [ ] 404 page handles invalid routes.
- [ ] Application degrades gracefully when backend is down.

GUARDRAILS:
Error boundary swallowing important errors; empty state CTAs pointing to wrong actions; error messages leaking internal details.

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
