# Phase 06 — Sprint 02: Quarantine Lifecycle State Machine

## Sprint Objective

Implement the quarantine state machine with lifecycle transitions (active, investigating, resolved, dismissed, escalated).

## Dependencies

P06-S01 flaky detection engine.

## Scope

### Granular Implementation Tasks

1. Create Quarantine Prisma model (id, testCaseId, projectId, status, assigneeId, deadline, notes, createdBy, createdAt, resolvedAt).
2. Implement state machine (Active -> Investigating -> Resolved/Dismissed, Active -> Escalated).
3. Create POST /api/v1/test-cases/:testCaseId/quarantine endpoint (Admin+ only).
4. Create PATCH /api/v1/quarantines/:id endpoint for status transitions.
5. Enforce valid state transitions (reject invalid transitions with clear error).
6. Record state transition history for audit trail.
7. Add quarantine status to test case detail view.

## Expected Files / Areas

`apps/api/src/modules/quarantine/`, `packages/db/prisma/schema.prisma`

## Testing & Verification

Unit tests for state machine transitions (valid and invalid). Integration tests for quarantine CRUD and RBAC.

## Acceptance Criteria

- [ ] Quarantine can be created by Admin+ with assignee and deadline.
- [ ] State transitions follow the defined state machine.
- [ ] Invalid transitions are rejected with clear errors.
- [ ] Transition history is recorded for audit.
- [ ] Quarantine status is visible in test case detail.
- [ ] Only Admin+ can create or transition quarantines.

## Risks / Guardrails

State machine bypass via direct database update; missing RBAC on transition endpoints; orphaned quarantines.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06, Sprint 02: Quarantine Lifecycle State Machine.

OBJECTIVE:
Implement the quarantine state machine with lifecycle transitions (active, investigating, resolved, dismissed, escalated).

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create Quarantine Prisma model (id, testCaseId, projectId, status, assigneeId, deadline, notes, createdBy, createdAt, resolvedAt).
2. Implement state machine (Active -> Investigating -> Resolved/Dismissed, Active -> Escalated).
3. Create POST /api/v1/test-cases/:testCaseId/quarantine endpoint (Admin+ only).
4. Create PATCH /api/v1/quarantines/:id endpoint for status transitions.
5. Enforce valid state transitions (reject invalid transitions with clear error).
6. Record state transition history for audit trail.
7. Add quarantine status to test case detail view.

TEST:
Unit tests for state machine transitions (valid and invalid). Integration tests for quarantine CRUD and RBAC.

ACCEPTANCE:
- [ ] Quarantine can be created by Admin+ with assignee and deadline.
- [ ] State transitions follow the defined state machine.
- [ ] Invalid transitions are rejected with clear errors.
- [ ] Transition history is recorded for audit.
- [ ] Quarantine status is visible in test case detail.
- [ ] Only Admin+ can create or transition quarantines.

GUARDRAILS:
State machine bypass via direct database update; missing RBAC on transition endpoints; orphaned quarantines.

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
