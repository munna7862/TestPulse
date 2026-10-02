# Phase 06 — Sprint 01: Flaky Test Detection Heuristic Engine

## Sprint Objective

Detect flaky tests automatically from retry outcomes and run history, without flagging genuine regressions as flaky.

## Dependencies

Phase 05 complete; the `flaky-analysis` job is enqueued on run completion (P04-S02).

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Implement the `flaky-analysis` job processor (runs on run completion, analyzing only the test cases in that run).
2. Signal 1, retry flake: a FLAKY result (failed, then passed on retry) marks the test SUSPECTED. Two or more retry flakes within the window mark it FLAKY.
3. Signal 2, same-commit disagreement: the same `commitSha` producing both PASSED and FAILED outcomes across runs marks the test FLAKY.
4. Signal 3, transition heuristic on tracked branches (default branch by default) over the last `flakyWindow` runs, with at least 5 samples: transitions ≥ `flakyThreshold` (3) → SUSPECTED; ≥ 5 → FLAKY.
5. Compute and document `flakyScore` (0–100); store `flakyState`, `flakyScore`, and `lastFlakyAt`.
6. Decay: a test returns to STABLE after 20 consecutive clean passes on tracked branches.
7. On a state change only, emit `testcase:flaky-changed` and enqueue the `test.flaky_detected` domain event.
8. `GET /api/v1/projects/:projectId/flaky-tests`, sorted by score.
9. FlakyBadge in run results and test case detail.
10. Project settings (Admin+): `flakyWindow`, `flakyThreshold`, `trackedBranches`.

## Expected Files / Areas

`packages/shared/src/flaky/` (pure algorithm), `apps/api/src/jobs/flaky-analysis.ts`, `apps/api/src/modules/flaky/`, `packages/ui/src/FlakyBadge.tsx`

## Testing & Verification

Table-driven unit tests for the pure algorithm with history patterns: always passing, consistent regression (fail, fail, fail), one-time fix (fail → pass), alternating, retry flakes, same-commit disagreement, insufficient samples, and feature-branch noise. Integration test from ingestion through job to a state change and event.

## Acceptance Criteria

- [ ] Retry flakes and same-commit disagreements are detected.
- [ ] Consistent regressions and one-time fixes are not flagged as flaky.
- [ ] Flaky state and score are stored and shown as a badge.
- [ ] The flaky test list endpoint returns tests sorted by score.
- [ ] Detection settings are configurable per project by Admin+.
- [ ] Detection runs automatically on run completion and only emits on state changes.

## Risks / Guardrails

False positives from feature-branch work-in-progress or real regressions; expensive recalculation on large histories (analyze only tests in the completed run, using indexed history queries); score normalization edge cases.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06 — Sprint 01: Flaky Test Detection Heuristic Engine.
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/06-phase-flaky-test-detection-quarantine.md
4. planning/sprints/P06-S01-flaky-test-detection-engine.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P06_S01.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P06-S01.md and update task.md.
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
