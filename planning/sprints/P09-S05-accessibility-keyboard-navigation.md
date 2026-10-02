# Phase 09 — Sprint 05: Accessibility Audit and Keyboard Navigation

## Sprint Objective

Conduct a comprehensive accessibility audit and implement keyboard navigation for all major workflows.

## Dependencies

P09-S04 error/empty/loading states.

## Personas

- **Lead:** `role-frontend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Run the axe-core audit on all pages in both themes.
2. Fix all critical and serious accessibility violations.
3. Keyboard navigation for the main dashboard, the live run view, and the quarantine workflow.
4. Add a skip-to-content link.
5. Visible focus indicators on all interactive elements.
6. ARIA labels on icons, badges, and status indicators; status is never conveyed by color alone.
7. Test with a screen reader (NVDA on Windows, VoiceOver on macOS), including live-region announcements during streaming.
8. Run the Lighthouse accessibility audit (target > 95).
9. Document accessibility compliance and known limitations in `docs/ux/accessibility.md`.

## Expected Files / Areas

`apps/web/src/`, `docs/ux/accessibility.md`

## Testing & Verification

Automated accessibility tests (axe-core). Keyboard navigation E2E tests. Lighthouse audit.

## Acceptance Criteria

- [ ] axe-core reports zero critical violations.
- [ ] Keyboard navigation works for all major workflows.
- [ ] Focus indicators are visible on all interactive elements.
- [ ] ARIA labels are present on all non-text elements.
- [ ] Lighthouse accessibility score > 95.
- [ ] Screen reader can navigate the main dashboard.

## Risks / Guardrails

Accessibility fixes breaking visual design; keyboard traps in modal dialogs; missing ARIA on dynamically added elements.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 09 — Sprint 05: Accessibility Audit and Keyboard Navigation.
Act as: role-frontend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/09-phase-ux-polish-accessibility.md
4. planning/sprints/P09-S05-accessibility-keyboard-navigation.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P09_S05.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P09-S05.md and update task.md.
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
