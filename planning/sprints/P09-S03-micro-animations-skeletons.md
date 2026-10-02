# Phase 09 — Sprint 03: Micro-Animations, Skeleton Loaders, and Transitions

## Sprint Objective

Add polish: skeleton loading screens, page transitions, hover effects, and micro-animations that make the UI feel premium.

## Dependencies

P09-S02 dark/light mode.

## Personas

- **Lead:** `role-frontend-engineer`
- **Reviewers / sign-off:** `role-product-owner`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Audit and complete skeleton loaders for all major views (most exist from feature sprints).
2. Page and panel transitions with CSS or the `motion` library (formerly Framer Motion), only where they aid orientation.
3. Hover and focus effects on interactive elements (cards, buttons, table rows).
4. Pulse animation for live / in-progress indicators.
5. Entry animation for streamed results, coalesced so it never animates thousands of rows.
6. Toast notifications with enter and exit animations.
7. Respect `prefers-reduced-motion` everywhere.
8. Use GPU-friendly properties only (transform, opacity).

## Expected Files / Areas

`apps/web/src/components/`, `apps/web/src/styles/`

## Testing & Verification

Visual regression tests for skeleton screens. Accessibility tests for reduced motion. Performance tests for animation frame rate.

## Acceptance Criteria

- [ ] Skeleton loaders appear during data fetching.
- [ ] Page transitions are smooth and consistent.
- [ ] Hover effects provide visual feedback.
- [ ] Live indicators pulse with animation.
- [ ] Reduced-motion preference disables animations.
- [ ] Animations run at 60fps without jank.

## Risks / Guardrails

Animations causing layout shifts; performance degradation on low-end devices; motion sickness for sensitive users.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 09 — Sprint 03: Micro-Animations, Skeleton Loaders, and Transitions.
Act as: role-frontend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-product-owner, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/09-phase-ux-polish-accessibility.md
4. planning/sprints/P09-S03-micro-animations-skeletons.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P09_S03.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P09-S03.md and update task.md.
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
