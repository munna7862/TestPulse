# Phase 09 — Sprint 05: Accessibility Audit and Keyboard Navigation

## Sprint Objective

Conduct a comprehensive accessibility audit and implement keyboard navigation for all major workflows.

## Dependencies

P09-S04 error/empty/loading states.

## Scope

### Granular Implementation Tasks

1. Run axe-core accessibility audit on all pages.
2. Fix all critical and serious accessibility violations.
3. Implement keyboard navigation for the main dashboard.
4. Add skip-to-content link.
5. Ensure all interactive elements have visible focus indicators.
6. Add ARIA labels to all icons, badges, and status indicators.
7. Test with screen reader (NVDA or VoiceOver).
8. Run Lighthouse accessibility audit (target score > 95).
9. Document accessibility compliance in README.

## Expected Files / Areas

`apps/web/src/`, `docs/accessibility.md`

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
You are the implementation agent for TestPulse, Phase 09, Sprint 05: Accessibility Audit and Keyboard Navigation.

OBJECTIVE:
Conduct a comprehensive accessibility audit and implement keyboard navigation for all major workflows.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Run axe-core accessibility audit on all pages.
2. Fix all critical and serious accessibility violations.
3. Implement keyboard navigation for the main dashboard.
4. Add skip-to-content link.
5. Ensure all interactive elements have visible focus indicators.
6. Add ARIA labels to all icons, badges, and status indicators.
7. Test with screen reader (NVDA or VoiceOver).
8. Run Lighthouse accessibility audit (target score > 95).
9. Document accessibility compliance in README.

TEST:
Automated accessibility tests (axe-core). Keyboard navigation E2E tests. Lighthouse audit.

ACCEPTANCE:
- [ ] axe-core reports zero critical violations.
- [ ] Keyboard navigation works for all major workflows.
- [ ] Focus indicators are visible on all interactive elements.
- [ ] ARIA labels are present on all non-text elements.
- [ ] Lighthouse accessibility score > 95.
- [ ] Screen reader can navigate the main dashboard.

GUARDRAILS:
Accessibility fixes breaking visual design; keyboard traps in modal dialogs; missing ARIA on dynamically added elements.

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
