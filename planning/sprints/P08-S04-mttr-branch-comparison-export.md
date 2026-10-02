# Phase 08 — Sprint 04: MTTR, Branch Comparison & Data Export

## Sprint Objective

Build advanced analytics: Mean Time to Resolution for quarantines, branch-to-branch comparison, and authenticated data export.

## Dependencies

P08-S03 leaderboard views.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Compute MTTR for quarantines from `QuarantineTransition` (RESOLVED only; DISMISSED reported separately).
2. Create the MTTR trend chart (is quarantine resolution getting faster?).
3. Build the branch comparison view (pass rate, duration, and failures between two branches over the same window).
4. CSV export for all analytics views, with formula-injection-safe escaping.
5. JSON export endpoint (session-authenticated, same RBAC as the views), documented in `docs/api/`.
6. Stream exports and cap them (e.g. 100k rows). Larger exports are rejected with guidance to narrow the range.
7. Add an analytics summary section to the email digests (P07-S03).
8. Deferred (post-MVP, do not build): public or shareable read-only dashboard links, which would be an unauthenticated path to tenant data.

## Expected Files / Areas

`apps/api/src/modules/analytics/`, `apps/web/src/features/analytics/`

## Testing & Verification

Unit tests for MTTR calculation. Integration tests for branch comparison and exports (including cross-tenant 404 and CSV escaping). E2E tests for CSV/JSON download.

## Acceptance Criteria

- [ ] MTTR is computed correctly for quarantined tests.
- [ ] The MTTR trend shows change over time.
- [ ] Branch comparison highlights differences clearly.
- [ ] CSV export contains all relevant data and is injection-safe.
- [ ] The JSON export is documented and respects RBAC and tenant isolation.
- [ ] Exports of large ranges are streamed or rejected gracefully, never timing out.

## Risks / Guardrails

MTTR skewed by outlier quarantines (also show the median); branch comparison misleading with different test counts; export timeouts on large datasets.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 08 — Sprint 04: MTTR, Branch Comparison & Data Export.
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/08-phase-analytics-reporting.md
4. planning/sprints/P08-S04-mttr-branch-comparison-export.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P08_S04.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P08-S04.md and update task.md.
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
