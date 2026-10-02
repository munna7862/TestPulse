# Phase 10 — Sprint 02: Integration and E2E Test Hardening

## Sprint Objective

Fill the test gaps identified in the audit: harden integration tests and add E2E tests for all critical user journeys.

## Dependencies

P10-S01 test coverage audit.

## Personas

- **Lead:** `role-sdet-architect`
- **Reviewers / sign-off:** `role-backend-engineer`, `role-frontend-engineer`, `role-realtime-engineer`

## Scope

### Granular Implementation Tasks

1. Integration tests for authentication edge cases (expired tokens, refresh reuse, invalid credentials, OAuth linking).
2. Integration tests for ingestion edge cases (malformed payloads, concurrent shards, retried batches, quota).
3. Integration and contract tests for WebSocket events (connection, room authorization, exactly-once delivery across instances).
4. Integration tests for quarantine state transitions and SLA markers.
5. E2E: sign-up → first live run, using the example reporter project.
6. E2E: two-browser real-time collaboration (live run + annotations).
7. E2E: quarantine lifecycle including SLA escalation (fake clock).
8. E2E: invitation and notification delivery.
9. Playwright fixtures and page objects; repeat each E2E spec at least 20 times in CI to prove it is deterministic.

## Expected Files / Areas

`apps/api/test/`, `apps/web/e2e/`

## Testing & Verification

Run all integration and E2E tests. Verify all critical journeys pass deterministically.

## Acceptance Criteria

- [ ] Integration tests cover all critical edge cases.
- [ ] E2E tests cover sign-up → first live run, live collaboration, quarantine lifecycle, and notifications.
- [ ] Each E2E spec passes 20 consecutive repetitions (no flakiness).
- [ ] Test fixtures are reusable and maintainable.

## Risks / Guardrails

Flaky E2E tests due to timing issues; test data pollution between test runs; overly brittle selectors.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10 — Sprint 02: Integration and E2E Test Hardening.
Act as: role-sdet-architect (load .agents/skills/role-sdet-architect/SKILL.md). Reviewers: role-backend-engineer, role-frontend-engineer, role-realtime-engineer.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/10-phase-quality-engineering-release.md
4. planning/sprints/P10-S02-integration-e2e-hardening.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P10_S02.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P10-S02.md and update task.md.
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
