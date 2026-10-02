# Phase 11 — Sprint 01: Landing Page Design and Implementation

## Sprint Objective

Build a stunning, conversion-optimized landing page that communicates TestPulse's value proposition in 30 seconds.

## Dependencies

Phase 10 complete (release candidate ready).

## Personas

- **Lead:** `role-growth-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Design the hero section with headline, subheadline, and CTA button.
2. Create the problem section (the pain of broken CI and flaky tests).
3. Create the solution section with feature highlights and real product screenshots.
4. Build an interactive demo preview driven by recorded fixture data (never a live tenant).
5. Build the 'How it works' section (3-step visual: sign up, integrate, observe).
6. Create the pricing comparison table generated from `@testpulse/shared/src/plans.ts` (quotas only; Pro CTA = contact/waitlist).
7. Add a social proof section (testimonials from design partners, or a placeholder).
8. Build a responsive footer with links and legal pages (privacy policy, terms).
9. Add restrained entrance animations (CSS or `motion`) that respect reduced motion.
10. Optimize to master plan §10 (LCP < 1.5 s; Lighthouse Performance, Accessibility, SEO ≥ 95).

## Expected Files / Areas

`apps/web/src/app/(marketing)/`

## Testing & Verification

Lighthouse audit (performance, SEO, accessibility). Responsive tests. Conversion funnel click-through test.

## Acceptance Criteria

- [ ] The landing page meets the master plan §10 marketing targets (LCP < 1.5 s, Lighthouse ≥ 95).
- [ ] The hero communicates the value proposition clearly.
- [ ] The pricing table shows all three tiers from the shared plan limits.
- [ ] CTA buttons link to sign-up (or the beta waitlist until P11-S05).
- [ ] The page is fully responsive (mobile, tablet, desktop).

## Risks / Guardrails

Over-designing at the expense of load time; CTA not prominent enough; missing mobile optimization.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 11 — Sprint 01: Landing Page Design and Implementation.
Act as: role-growth-engineer + role-frontend-engineer (load .agents/skills/role-growth-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/11-phase-landing-page-docs-gtm.md
4. planning/sprints/P11-S01-landing-page.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P11_S01.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P11-S01.md and update task.md.
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
