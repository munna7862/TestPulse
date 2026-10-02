# Phase 06 — Sprint 04: Quarantine Dashboard and Bulk Operations

## Sprint Objective

Build a dedicated quarantine management dashboard with bulk operations for efficient triage workflows.

## Dependencies

P06-S03 collaborative annotations.

## Scope

### Granular Implementation Tasks

1. Create QuarantineDashboard page (/projects/:projectId/quarantine).
2. Display all quarantined tests grouped by status (Active, Investigating, Escalated).
3. Show quarantine age, assignee, deadline, and SLA countdown.
4. Implement bulk select and bulk transition (e.g., resolve multiple quarantines).
5. Add filters: status, assignee, age, overdue only.
6. Implement quarantine timeline view (when created, transitions, comments).
7. Add export quarantine report as CSV.

## Expected Files / Areas

`apps/web/src/features/quarantine/QuarantineDashboard.tsx`

## Testing & Verification

E2E tests for quarantine dashboard rendering, filtering, bulk operations, and CSV export.

## Acceptance Criteria

- [ ] Quarantine dashboard displays all quarantined tests.
- [ ] Tests are grouped by quarantine status.
- [ ] SLA countdown is visible and accurate.
- [ ] Bulk operations work correctly.
- [ ] Filters narrow the quarantine list.
- [ ] CSV export includes all quarantine data.

## Risks / Guardrails

Bulk operation partially failing (some succeed, some fail); SLA timezone issues; CSV injection in export.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06, Sprint 04: Quarantine Dashboard and Bulk Operations.

OBJECTIVE:
Build a dedicated quarantine management dashboard with bulk operations for efficient triage workflows.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create QuarantineDashboard page (/projects/:projectId/quarantine).
2. Display all quarantined tests grouped by status (Active, Investigating, Escalated).
3. Show quarantine age, assignee, deadline, and SLA countdown.
4. Implement bulk select and bulk transition (e.g., resolve multiple quarantines).
5. Add filters: status, assignee, age, overdue only.
6. Implement quarantine timeline view (when created, transitions, comments).
7. Add export quarantine report as CSV.

TEST:
E2E tests for quarantine dashboard rendering, filtering, bulk operations, and CSV export.

ACCEPTANCE:
- [ ] Quarantine dashboard displays all quarantined tests.
- [ ] Tests are grouped by quarantine status.
- [ ] SLA countdown is visible and accurate.
- [ ] Bulk operations work correctly.
- [ ] Filters narrow the quarantine list.
- [ ] CSV export includes all quarantine data.

GUARDRAILS:
Bulk operation partially failing (some succeed, some fail); SLA timezone issues; CSV injection in export.

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
