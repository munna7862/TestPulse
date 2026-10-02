# Phase 08 — Sprint 03: Top Failing, Slowest, and Flakiest Test Views

## Sprint Objective

Build leaderboard-style views for the most problematic tests, helping teams prioritize fixing efforts.

## Dependencies

P08-S02 trend charts.

## Personas

- **Lead:** `role-frontend-engineer`, `role-backend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Create TopFailingTests component (table: test name, failure count, last failure, trend).
2. Create SlowestTests component (table: test name, avg duration, p95 duration, trend).
3. Create FlakiestTests component (table: test name, flaky score, transition count, last flaky).
4. Implement configurable time range for all leaderboards.
5. Add click-through from leaderboard to test case detail.
6. Create summary cards for project dashboard (failure rate, slowest test, flakiest test).
7. Implement data refresh on new run completion (via WebSocket event).

## Expected Files / Areas

`apps/web/src/features/analytics/`, `apps/api/src/modules/analytics/`

## Testing & Verification

Integration tests for leaderboard API endpoints. E2E tests for rendering and click-through navigation.

## Acceptance Criteria

- [ ] Top failing tests are accurately ranked.
- [ ] Slowest tests show correct duration metrics.
- [ ] Flakiest tests reflect flaky detection scores.
- [ ] Ties are broken deterministically (secondary sort by title, then id).
- [ ] The time range filter changes leaderboard data.
- [ ] Click-through navigates to test case detail.
- [ ] Data refreshes on run completion via the WebSocket event.

## Risks / Guardrails

Ranking ties not handled consistently; performance of ranking queries on large test suites; stale cache after new runs.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 08 — Sprint 03: Top Failing, Slowest, and Flakiest Test Views.
Act as: role-frontend-engineer + role-backend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md, .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/08-phase-analytics-reporting.md
4. planning/sprints/P08-S03-top-failing-slowest-flakiest.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P08_S03.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P08-S03.md and update task.md.
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
