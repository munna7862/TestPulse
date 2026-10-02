# Phase 09 — Sprint 04: Error, Empty, and Loading State Handling

## Sprint Objective

Ensure every view has thoughtful error, empty, and loading states with clear CTAs and recovery options.

## Dependencies

P09-S03 micro-animations.

## Personas

- **Lead:** `role-frontend-engineer`
- **Reviewers / sign-off:** `role-product-owner`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Audit every view for error, empty, and loading states, and fill the gaps (most exist from feature sprints).
2. A reusable ErrorBoundary with a retry action, plus route-level `error.tsx` and `not-found.tsx`.
3. EmptyState variants with CTAs for no projects, no runs, no test cases, no quarantines, and no notifications.
4. Map API error codes (shared enum) to user-friendly messages, never exposing internal details.
5. WebSocket disconnection banner with a reconnect button (consistent with the P05-S06 degraded mode).
6. A 404 page for invalid routes and resources (including cross-tenant 404s).
7. A maintenance mode page.
8. Graceful degradation when the backend is unreachable.

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
You are the implementation agent for TestPulse, Phase 09 — Sprint 04: Error, Empty, and Loading State Handling.
Act as: role-frontend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-product-owner, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/09-phase-ux-polish-accessibility.md
4. planning/sprints/P09-S04-error-empty-loading-states.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P09_S04.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P09-S04.md and update task.md.
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
