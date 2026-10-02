# Phase 05 — Sprint 04: Run Summary Cards and Run List with Filters

## Sprint Objective

Build the run list view with summary cards, filtering by status/branch/date, and quick navigation to run details.

## Dependencies

P05-S03 live run progress.

## Personas

- **Lead:** `role-frontend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Create the RunSummaryCard component (status badge, branch, commit, pass/fail/skip/flaky counts, duration, timestamp).
2. Create the RunList component with cursor-based infinite scroll.
3. Filters for status (running/passed/failed/cancelled/timed out), branch, and date range, persisted in URL search params.
4. Search by commit SHA or branch name.
5. Real-time updates: new runs appear at the top; running cards update their counters.
6. Empty state for projects with no runs, linking to the API key + reporter setup.
7. Quick actions: open the CI job (`ciJobUrl`), view details, and compare with the previous run on the same branch.

## Expected Files / Areas

`apps/web/src/features/runs/RunList.tsx`, `apps/web/src/features/runs/RunSummaryCard.tsx`

## Testing & Verification

E2E tests for rendering, filtering (including URL persistence), pagination, and live insertion. Visual regression for card layouts in both themes.

## Acceptance Criteria

- [ ] The run list displays all runs with summary cards.
- [ ] Filters work correctly and survive reload and sharing via URL.
- [ ] New runs appear in real time at the top.
- [ ] Infinite scroll works for large run counts.
- [ ] The empty state guides the user to set up the reporter.
- [ ] Run cards link to the detail view and the CI job.

## Risks / Guardrails

Infinite-scroll performance on thousands of runs; live inserts shifting the scroll position; filter state not preserved in the URL; missing loading states.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05 — Sprint 04: Run Summary Cards and Run List with Filters.
Act as: role-frontend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/05-phase-real-time-dashboard.md
4. planning/sprints/P05-S04-run-summary-cards-list.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P05_S04.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P05-S04.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] New or changed screens have loading, empty and error states and pass the axe-core check in light and dark themes.
- [ ] Acceptance criteria verified.
- [ ] Feature catalog status and scenario catalog "Automated by" entries updated; tests carry `[SC-*]` IDs in their titles.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
