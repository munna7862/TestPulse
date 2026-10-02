# Phase 09 — Sprint 02: Theme QA & Chart Theming

## Sprint Objective

Verify that every screen, chart, and state works in both themes, and fix the gaps found. Theme switching itself ships in P02-S06.

## Dependencies

P09-S01 design system tokens.

## Personas

- **Lead:** `role-frontend-engineer`
- **Reviewers / sign-off:** `role-product-owner`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Run visual regression for every screen in light and dark themes and fix the issues found.
2. Theme charts entirely through tokens, and make status colors distinguishable for color-blind users (icons or patterns, not color alone).
3. Persist the theme preference to the user profile (cross-device), in addition to the local preference.
4. Add a regression test for theme flash on load.
5. Fix every contrast issue found (WCAG 2.1 AA).

## Expected Files / Areas

`apps/web/src/`, `packages/ui/`

## Testing & Verification

Visual regression in both themes. A FOUC regression test. Automated contrast checks.

## Acceptance Criteria

- [ ] Every screen renders correctly in both themes (visual regression green).
- [ ] Charts adapt to the current theme and do not rely on color alone.
- [ ] The theme preference follows the user across devices.
- [ ] There is no flash of the wrong theme on load.
- [ ] There are no contrast violations.

## Risks / Guardrails

Chart colors unreadable in dark mode; regressions in screens without baselines; preference sync conflicting with the local choice.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 09 — Sprint 02: Theme QA & Chart Theming.
Act as: role-frontend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-product-owner, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/09-phase-ux-polish-accessibility.md
4. planning/sprints/P09-S02-theme-qa-chart-theming.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P09_S02.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P09-S02.md and update task.md.
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
