# Phase 02 — Sprint 06: Design System Foundation and App Shell

## Sprint Objective

Establish the design tokens, theming (dark/light with no flash), base UI primitives, and authenticated app shell **before** any feature UI is built, so Phases 03–08 build on them instead of retrofitting in Phase 09.

## Dependencies

P02-S02 (Next.js scaffold), P02-S04 (tooling). Can run in parallel with P02-S05. Informed by P01-S02 wireframes.

## Personas

- **Lead:** `role-frontend-engineer`
- **Reviewers / sign-off:** `role-product-owner`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Define semantic design tokens in Tailwind CSS v4 CSS-first `@theme` (surface, text, border, primary, success, danger, warning, info, plus test-status colors for passed/failed/skipped/flaky/quarantined/running), spacing, radii, shadows, and z-index scale.
2. Define dark and light values for every semantic token. Verify WCAG 2.1 AA contrast for text and status colors in both themes.
3. Implement theme switching (system / light / dark) with the choice persisted in a cookie or localStorage and applied by an inline pre-hydration script, so there is no flash of the wrong theme.
4. Self-host fonts with `next/font` (Inter for UI, JetBrains Mono for code and stack traces). No runtime requests to Google Fonts.
5. Build base primitives in `@testpulse/ui` on Radix: Button, IconButton, Input, Select, Checkbox, Badge, StatusBadge, Card, Dialog, DropdownMenu, Tooltip, Tabs, Table, Skeleton, EmptyState, Toast, plus a `CodeBlock` that renders untrusted text safely.
6. Build the app shell layout (sidebar navigation, header with org/project switcher placeholder, theme toggle, connection-status slot, notification-bell slot, breadcrumbs), following the P01-S02 information architecture.
7. Create a component catalog route (`/dev/ui`, excluded from production builds) or Storybook, showing every primitive in both themes.
8. Add Playwright visual snapshots and `@axe-core/playwright` checks for the catalog in both themes. These become the baseline for later UI sprints.

## Expected Files / Areas

`packages/ui/`, `apps/web/src/styles/`, `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/providers/ThemeProvider.tsx`, `docs/ux/design-tokens.md`

## Testing & Verification

Component tests for primitives (keyboard interaction, focus management, ARIA). Playwright visual snapshots and axe-core checks for the catalog in light and dark themes. A no-flash check that loads the page with dark preference and asserts the first paint uses dark tokens.

## Acceptance Criteria

- [ ] Semantic tokens exist for light and dark themes and pass AA contrast checks.
- [ ] Theme follows system preference by default, persists the user's choice, and does not flash on load.
- [ ] Base primitives are keyboard-accessible and have zero axe-core critical/serious violations.
- [ ] App shell renders with navigation, breadcrumbs, and placeholder slots for later sprints.
- [ ] Component catalog shows every primitive in both themes, with visual snapshot baselines committed.
- [ ] No hardcoded colors in `apps/web` or `packages/ui` (lint rule or grep check in CI).

## Risks / Guardrails

Over-building components that no sprint needs yet (build only what Phases 03–05 use first); snapshot tests that are flaky across OSes (generate baselines on Linux CI only); tokens that are hard to change later (keep semantic names, not color names).

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02 — Sprint 06: Design System Foundation and App Shell.
Act as: role-frontend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-product-owner, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/02-phase-project-bootstrap-devops.md
4. planning/sprints/P02-S06-design-system-foundation-app-shell.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P02_S06.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P02-S06.md and update task.md.
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
