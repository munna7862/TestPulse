# Phase 06 — Sprint 04: Quarantine Dashboard and Bulk Operations

## Sprint Objective

Build a dedicated quarantine management dashboard with bulk operations for efficient triage workflows.

## Dependencies

P06-S03 collaborative annotations.

## Personas

- **Lead:** `role-frontend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Create the QuarantineDashboard page for the project.
2. Group open quarantines by status (ACTIVE, INVESTIGATING) with escalation badges from the SLA markers, plus a tab for closed records.
3. Show quarantine age, assignee, and an SLA countdown (stored in UTC, displayed in local time).
4. Bulk transition and assign (max 100 per request). Each item runs the same state-machine and RBAC checks, and the response reports a result per item.
5. Filters in URL params: status, assignee, overdue, escalated.
6. Timeline view combining transitions and comments.
7. CSV export with formula-injection-safe escaping.

## Expected Files / Areas

`apps/web/src/features/quarantine/QuarantineDashboard.tsx`

## Testing & Verification

E2E tests for quarantine dashboard rendering, filtering, bulk operations, and CSV export.

## Acceptance Criteria

- [ ] The quarantine dashboard displays all quarantines for the project.
- [ ] Quarantines are grouped by status with escalation indicators.
- [ ] The SLA countdown is accurate across time zones.
- [ ] Bulk operations report per-item success or failure, and the UI shows which items failed.
- [ ] Filters narrow the list and persist in the URL.
- [ ] CSV export includes all quarantine data and is safe to open in spreadsheet software.

## Risks / Guardrails

Bulk operations partially failing without clear feedback; SLA time zone issues; CSV formula injection in exports.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06 — Sprint 04: Quarantine Dashboard and Bulk Operations.
Act as: role-frontend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/06-phase-flaky-test-detection-quarantine.md
4. planning/sprints/P06-S04-quarantine-dashboard-bulk-operations.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P06_S04.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P06-S04.md and update task.md.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] New or changed screens have loading, empty and error states and pass the axe-core check in light and dark themes.
- [ ] Acceptance criteria verified.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
