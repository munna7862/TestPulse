# Phase 07 — Sprint 04: GitHub CI Reporting (Job Summary, PR Comment & Check Run)

## Sprint Objective

Surface TestPulse results inside GitHub from the CI side, using the workflow's `GITHUB_TOKEN` (no server-side GitHub App, per D-07).

## Dependencies

P04-S05 reporter, P06-S01 flaky detection, P06-S02 quarantine (for flaky and quarantined counts).

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-devops-engineer`, `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. `GET /api/v1/ingest/runs/:runId/summary` (API key): counts including flaky and quarantined failures, plus the dashboard URL.
2. Reporter: when `GITHUB_ACTIONS=true`, write a Markdown summary to `$GITHUB_STEP_SUMMARY` (counts, top failures, flaky, quarantined, dashboard link).
3. Optional PR comment (`github.prComment: true`, needs `pull-requests: write`): one comment upserted by a hidden marker (no duplicates on re-runs) and truncated for large suites.
4. Optional check run (`github.checkRun: true`, needs `checks: write`) with annotations for failed tests (batched at 50 per request).
5. Never fail CI because of a GitHub API error. Handle rate limits, and degrade to the job summary on fork PRs where the token is read-only.
6. Document the workflow example and required permissions in `docs/integrations/github.md`.

## Expected Files / Areas

`packages/reporter/src/github/`, `apps/api/src/modules/ingest/summary.ts`, `docs/integrations/github.md`

## Testing & Verification

Unit tests for summary/comment rendering and truncation. Integration tests with a mocked GitHub API (MSW): comment upsert, check-run annotations, rate limit, and the fork read-only token. A real smoke run in this repo's own CI.

## Acceptance Criteria

- [ ] The job summary shows TestPulse results with a dashboard link.
- [ ] The PR comment is created once and updated on re-runs.
- [ ] The check run shows pass/fail with annotations for failed tests.
- [ ] GitHub API failures never fail the CI job.
- [ ] The setup documentation is complete and tested.

## Risks / Guardrails

GitHub API rate limits; duplicate comments on re-runs; comments too long for large suites; fork PR token permissions.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07 — Sprint 04: GitHub CI Reporting (Job Summary, PR Comment & Check Run).
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-devops-engineer, role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/07-phase-notifications-integrations.md
4. planning/sprints/P07-S04-github-ci-reporter.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P07_S04.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P07-S04.md and update task.md.
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
