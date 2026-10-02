# Phase 09 — Sprint 02: Dark Mode, Light Mode, and System Preference Detection

## Sprint Objective

Implement dark/light theme switching with system preference detection and persistent user choice.

## Dependencies

P09-S01 design system tokens.

## Scope

### Granular Implementation Tasks

1. Implement dark mode color tokens alongside light mode.
2. Create ThemeToggle component (sun/moon icon in header).
3. Detect system preference (prefers-color-scheme media query).
4. Persist theme choice in localStorage.
5. Apply theme via CSS custom properties on document root.
6. Ensure all components render correctly in both themes.
7. Prevent flash of unstyled content (FOUC) on page load.
8. Test chart components in dark mode (Recharts/Nivo theming).

## Expected Files / Areas

`apps/web/src/providers/ThemeProvider.tsx`, `apps/web/src/styles/`

## Testing & Verification

E2E tests for theme switching. Visual regression tests in both modes. FOUC prevention test.

## Acceptance Criteria

- [ ] Dark mode renders all components correctly.
- [ ] Light mode renders all components correctly.
- [ ] System preference is detected on first visit.
- [ ] User choice persists across sessions.
- [ ] No FOUC on page load.
- [ ] Charts adapt to current theme.

## Risks / Guardrails

Chart colors invisible in dark mode; FOUC causing layout shift; some components missing dark mode styles.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 09, Sprint 02: Dark Mode, Light Mode, and System Preference Detection.

OBJECTIVE:
Implement dark/light theme switching with system preference detection and persistent user choice.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Implement dark mode color tokens alongside light mode.
2. Create ThemeToggle component (sun/moon icon in header).
3. Detect system preference (prefers-color-scheme media query).
4. Persist theme choice in localStorage.
5. Apply theme via CSS custom properties on document root.
6. Ensure all components render correctly in both themes.
7. Prevent flash of unstyled content (FOUC) on page load.
8. Test chart components in dark mode (Recharts/Nivo theming).

TEST:
E2E tests for theme switching. Visual regression tests in both modes. FOUC prevention test.

ACCEPTANCE:
- [ ] Dark mode renders all components correctly.
- [ ] Light mode renders all components correctly.
- [ ] System preference is detected on first visit.
- [ ] User choice persists across sessions.
- [ ] No FOUC on page load.
- [ ] Charts adapt to current theme.

GUARDRAILS:
Chart colors invisible in dark mode; FOUC causing layout shift; some components missing dark mode styles.

At completion:
- Run the relevant verification commands.
- Report changed files.
- Report tests executed and results.
- Report known limitations.
- Do not suppress or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Tests added or updated for changed behavior.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Relevant tests pass.
- [ ] Build passes when applicable.
- [ ] Acceptance criteria verified.
- [ ] Git diff reviewed.
- [ ] Documentation updated when behavior or architecture changed.
- [ ] Sprint can be handed to the next sprint without hidden manual steps.
