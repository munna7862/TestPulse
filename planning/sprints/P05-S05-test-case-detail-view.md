# Phase 05 — Sprint 05: Individual Test Case Detail View

## Sprint Objective

Build the test case detail page showing the full history timeline, current status, annotations, and quick actions.

## Dependencies

P05-S04 run list.

## Personas

- **Lead:** `role-frontend-engineer`, `role-backend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Create the TestCaseDetail page under the project route.
2. Show test case metadata (title path, suite, file path, runner project, tags, current status, flaky state).
3. Display the history timeline (last 20 results with status per run, branch filter).
4. Show the latest error details for failing tests (rendered as text).
5. Display a duration trend mini chart (last 20 durations) using theme tokens.
6. Add quick actions: copy file path and link to the latest run. Reserve slots for quarantine and annotate, which are wired in Phase 06.
7. Link from run results to test case detail and back.
8. Breadcrumb navigation (Project > Suite > Test Case).

## Expected Files / Areas

`apps/web/src/features/test-cases/TestCaseDetail.tsx`

## Testing & Verification

E2E tests for test case detail rendering, history timeline, and navigation between views.

## Acceptance Criteria

- [ ] The test case detail page renders with all metadata.
- [ ] The history timeline shows the pass/fail pattern across runs, filterable by branch.
- [ ] Error details are displayed for failing tests.
- [ ] The duration trend chart renders correctly in both themes.
- [ ] Navigation between runs and test cases works, with correct breadcrumbs.

## Risks / Guardrails

Slow history queries on high-traffic test cases; chart rendering performance; deep-link routing issues.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05 — Sprint 05: Individual Test Case Detail View.
Act as: role-frontend-engineer + role-backend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md, .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/05-phase-real-time-dashboard.md
4. planning/sprints/P05-S05-test-case-detail-view.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P05_S05.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P05-S05.md and update task.md.
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
