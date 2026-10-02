# Phase 10 — Sprint 06: v1.0 Release Candidate & Private Beta Launch

## Sprint Objective

Build the release candidate, run the final quality gates, publish the reporter, and ship v1.0 to production for invited design partners (private beta). The public launch is P11-S05.

## Dependencies

P10-S05 staging validation.

## Personas

- **Lead:** `role-devops-engineer`, `role-scrum-master`
- **Reviewers / sign-off:** `role-product-owner`, `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Create the release branch (`release/v1.0.0`).
2. Run the complete quality gate checklist (lint, typecheck, unit, integration, contract, E2E, security, performance).
3. Verify the acceptance criteria from all phases.
4. Write CHANGELOG.md with all features, fixes, and known limitations.
5. Update version numbers across all packages.
6. Publish `@testpulse/reporter` 1.0.0 to npm with provenance. This requires a human with npm credentials.
7. Create a production deployment plan with a rollback strategy (Railway rollback, Vercel instant rollback, backward-compatible migrations).
8. Prepare post-launch monitoring dashboards and alerts.
9. Deploy to production with sign-up restricted to invited design partners.
10. Obtain final sign-off from a human reviewer.

## Expected Files / Areas

`CHANGELOG.md`, `docs/ops/release-plan.md`

## Testing & Verification

Run all quality gates. Review CHANGELOG. Review deployment plan. Final human sign-off.

## Acceptance Criteria

- [ ] All quality gates pass (lint, typecheck, test, contract, E2E, build, security, performance).
- [ ] CHANGELOG documents all features and known limitations.
- [ ] Version numbers are updated, and the reporter is published to npm.
- [ ] The deployment plan includes a tested rollback strategy.
- [ ] Monitoring dashboards and alerts are live.
- [ ] v1.0 runs in production for invited design partners.
- [ ] Human sign-off is obtained.

## Risks / Guardrails

Last-minute critical bug; quality gate regression; missing known limitation documentation.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10 — Sprint 06: v1.0 Release Candidate & Private Beta Launch.
Act as: role-devops-engineer + role-scrum-master (load .agents/skills/role-devops-engineer/SKILL.md, .agents/skills/role-scrum-master/SKILL.md). Reviewers: role-product-owner, role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/10-phase-quality-engineering-release.md
4. planning/sprints/P10-S06-release-candidate-signoff.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P10_S06.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P10-S06.md and update task.md.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] Acceptance criteria verified.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
