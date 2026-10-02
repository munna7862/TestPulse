# Phase 09 — Sprint 01: Design System Consolidation & Visual Regression

## Sprint Objective

Audit and consolidate the design system built in P02-S06 across every screen shipped in Phases 03–08, and lock it in with visual regression baselines.

## Dependencies

Phase 08 complete (analytics and charts).

## Personas

- **Lead:** `role-frontend-engineer`
- **Reviewers / sign-off:** `role-product-owner`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Audit every screen for token compliance and remove one-off styles and hardcoded values.
2. Extract repeated patterns from apps/web into `@testpulse/ui` composite components (data table, filter bar, stat card, timeline).
3. Refine the typography scale, spacing, and density for data-heavy tables.
4. Complete the component catalog for all primitives and composite components.
5. Add visual regression baselines for key screens in light and dark themes (generated on Linux CI).
6. Document the design system in `docs/ux/design-tokens.md`.

## Expected Files / Areas

`packages/ui/`, `apps/web/src/styles/`, `docs/ux/design-tokens.md`

## Testing & Verification

Visual regression for components and key screens. Contrast checks for all token pairs. Lint/grep check for hardcoded colors.

## Acceptance Criteria

- [ ] No hardcoded colors or one-off styles remain in apps/web.
- [ ] Repeated UI patterns live in `@testpulse/ui`.
- [ ] The component catalog covers every primitive and composite component.
- [ ] Visual regression baselines exist for key screens in both themes.
- [ ] The design system is documented.

## Risks / Guardrails

Refactors breaking existing screens (rely on visual regression); flaky screenshot tests across OSes; scope creep into a redesign.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 09 — Sprint 01: Design System Consolidation & Visual Regression.
Act as: role-frontend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-product-owner, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/09-phase-ux-polish-accessibility.md
4. planning/sprints/P09-S01-design-system-consolidation.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P09_S01.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P09-S01.md and update task.md.
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
