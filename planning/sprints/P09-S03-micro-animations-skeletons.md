# Phase 09 — Sprint 03: Micro-Animations, Skeleton Loaders, and Transitions

## Sprint Objective

Add polish: skeleton loading screens, page transitions, hover effects, and micro-animations that make the UI feel premium.

## Dependencies

P09-S02 dark/light mode.

## Scope

### Granular Implementation Tasks

1. Create skeleton loader components for all major views (run list, test case detail, charts).
2. Implement page transition animations (Framer Motion).
3. Add hover effects to interactive elements (cards, buttons, table rows).
4. Create pulse animation for live/in-progress indicators.
5. Add slide-in animation for real-time result streaming.
6. Implement toast notifications with enter/exit animations.
7. Respect prefers-reduced-motion media query.
8. Optimize animation performance (GPU-accelerated transforms).

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
You are the implementation agent for TestPulse, Phase 09, Sprint 03: Micro-Animations, Skeleton Loaders, and Transitions.

OBJECTIVE:
Add polish: skeleton loading screens, page transitions, hover effects, and micro-animations that make the UI feel premium.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create skeleton loader components for all major views (run list, test case detail, charts).
2. Implement page transition animations (Framer Motion).
3. Add hover effects to interactive elements (cards, buttons, table rows).
4. Create pulse animation for live/in-progress indicators.
5. Add slide-in animation for real-time result streaming.
6. Implement toast notifications with enter/exit animations.
7. Respect prefers-reduced-motion media query.
8. Optimize animation performance (GPU-accelerated transforms).

TEST:
Visual regression tests for skeleton screens. Accessibility tests for reduced motion. Performance tests for animation frame rate.

ACCEPTANCE:
- [ ] Skeleton loaders appear during data fetching.
- [ ] Page transitions are smooth and consistent.
- [ ] Hover effects provide visual feedback.
- [ ] Live indicators pulse with animation.
- [ ] Reduced-motion preference disables animations.
- [ ] Animations run at 60fps without jank.

GUARDRAILS:
Animations causing layout shifts; performance degradation on low-end devices; motion sickness for sensitive users.

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
