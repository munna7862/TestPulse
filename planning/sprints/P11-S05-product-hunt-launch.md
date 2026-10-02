# Phase 11 — Sprint 05: Public Launch (Product Hunt & GTM Execution)

## Sprint Objective

Open TestPulse to the public: remove the private-beta gate, and prepare and execute the Product Hunt / Show HN launch.

## Dependencies

P11-S04 SEO and analytics.

## Personas

- **Lead:** `role-growth-engineer`, `role-product-owner`
- **Reviewers / sign-off:** `role-devops-engineer`, `role-scrum-master`

## Scope

### Granular Implementation Tasks

1. Remove the private-beta sign-up restriction (feature flag) after a final production readiness check.
2. Create the Product Hunt listing (tagline, description, screenshots, logo).
3. Design social media banner images (Twitter/X, LinkedIn).
4. Write the launch announcement blog post.
5. Prepare the Show HN post.
6. Create a demo video or GIF walkthrough.
7. Prepare the email announcement for beta users and the waitlist.
8. Create the launch-day monitoring checklist (uptime, error rates, sign-ups, ingestion latency, queue depth) and on-call rota.
9. Prepare the FAQ and a support channel for launch-day questions.
10. Load test the sign-up and onboarding flow at the anticipated launch traffic.

## Expected Files / Areas

`docs/launch/`, marketing assets

## Testing & Verification

Review all launch materials. Load test sign-up and onboarding. Verify monitoring and alerts. Posting to Product Hunt, HN, and social channels is done by a human.

## Acceptance Criteria

- [ ] Product Hunt listing is complete with all assets.
- [ ] Social media assets are designed and ready.
- [ ] Launch blog post is written and reviewed.
- [ ] Demo video/GIF is created.
- [ ] Launch-day monitoring is configured.
- [ ] Sign-up flow works under anticipated launch load.
- [ ] FAQ is prepared for common questions.

## Risks / Guardrails

Launch-day traffic overwhelming infrastructure; sign-up flow breaking under load; missing monitoring for critical paths.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 11 — Sprint 05: Public Launch (Product Hunt & GTM Execution).
Act as: role-growth-engineer + role-product-owner (load .agents/skills/role-growth-engineer/SKILL.md, .agents/skills/role-product-owner/SKILL.md). Reviewers: role-devops-engineer, role-scrum-master.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/11-phase-landing-page-docs-gtm.md
4. planning/sprints/P11-S05-product-hunt-launch.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P11_S05.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P11-S05.md and update task.md.
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
