# Phase 10 — Sprint 01: Test Coverage Audit and Gap Analysis

## Sprint Objective

Audit existing test coverage, identify gaps, and create a prioritized plan for coverage improvement.

## Dependencies

Phase 09 complete (UX polish and accessibility).

## Personas

- **Lead:** `role-sdet-architect`
- **Reviewers / sign-off:** `role-scrum-master`

## Scope

### Granular Implementation Tasks

1. Generate the coverage report across all workspaces (collected in CI since P02-S05).
2. Identify untested critical paths (auth, ingestion, real-time, quarantine, notifications, webhooks).
3. Build a test gap matrix (feature vs. unit/integration/contract/E2E).
4. Prioritize gaps by risk (security-critical > core business > UI).
5. Create a test improvement plan with effort estimates (executed in P10-S02).
6. Confirm CI thresholds meet master plan §10 and ratchet them up to current levels.
7. Verify the isolation-suite meta-test covers every route.

## Expected Files / Areas

`docs/testing/coverage-audit.md`, `vitest.config.*`, `.github/workflows/ci.yml`

## Testing & Verification

Run coverage report. Verify coverage thresholds in CI. Review gap analysis.

## Acceptance Criteria

- [ ] A coverage report is generated for all workspaces.
- [ ] Critical path gaps are identified and prioritized.
- [ ] The test improvement plan has effort estimates.
- [ ] CI thresholds meet or exceed the master plan §10 targets.
- [ ] Every route is covered by the isolation suite.

## Risks / Guardrails

Chasing coverage numbers over meaningful tests; missing edge cases despite high line coverage.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10 — Sprint 01: Test Coverage Audit and Gap Analysis.
Act as: role-sdet-architect (load .agents/skills/role-sdet-architect/SKILL.md). Reviewers: role-scrum-master.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/10-phase-quality-engineering-release.md
4. planning/sprints/P10-S01-test-coverage-audit.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P10_S01.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P10-S01.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] Acceptance criteria verified.
- [ ] Feature catalog status and scenario catalog "Automated by" entries updated; tests carry `[SC-*]` IDs in their titles.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
