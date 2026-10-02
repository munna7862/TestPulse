# Phase 06 — Sprint 02: Quarantine Lifecycle State Machine

## Sprint Objective

Implement the quarantine lifecycle (master plan §5): a validated state machine, an audit trail, and Member-level triage permissions.

## Dependencies

P06-S01 flaky detection engine.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Add the `QuarantineRecord` and `QuarantineTransition` models per master plan §5, with a partial unique index allowing at most one open (ACTIVE/INVESTIGATING) record per test case.
2. Implement the state machine as a pure function in `@testpulse/shared`: quarantine → ACTIVE; ACTIVE → INVESTIGATING (assign/start); ACTIVE|INVESTIGATING → RESOLVED (requires a closing note); ACTIVE|INVESTIGATING → DISMISSED (requires a reason). Closed records are never reopened; re-quarantining creates a new record. SLA escalation uses markers, not states.
3. `POST /api/v1/projects/:projectId/test-cases/:testCaseId/quarantine` (Member+).
4. `PATCH /api/v1/projects/:projectId/quarantines/:quarantineId` for transitions and assignment (Member+). The assignee must be a Member+ of the org.
5. Set `slaDueAt = createdAt + project.slaDays`.
6. In one transaction, write the transition, update `TestCase.isQuarantined`, and then (after commit) emit `quarantine:changed` and enqueue the `quarantine.created` / `quarantine.closed` domain events.
7. `GET /api/v1/ingest/quarantined-tests` now returns the fingerprints of open quarantines.
8. Quarantine panel and quarantine dialog on the test case detail page (wiring the slots from P05-S05).

## Expected Files / Areas

`packages/shared/src/quarantine/`, `apps/api/src/modules/quarantine/`, `packages/db/prisma/schema.prisma`, `apps/web/src/features/quarantine/`

## Testing & Verification

Unit tests for every valid and invalid transition. Integration tests for CRUD, RBAC (Member allowed, Viewer 403, other tenant 404), concurrent quarantine of the same test (exactly one succeeds, the other gets 409), and the audit trail.

## Acceptance Criteria

- [ ] Members and above can quarantine tests with an assignee and reason; Viewers cannot.
- [ ] State transitions follow the state machine; invalid transitions are rejected with clear errors.
- [ ] Every transition is recorded with actor and timestamp.
- [ ] Only one open quarantine can exist per test case.
- [ ] Quarantine status is visible on the test case detail and reflected in the ingest quarantine list.

## Risks / Guardrails

State machine bypass via direct database updates; denormalized `isQuarantined` drifting from records (update both in one transaction); missing RBAC on transition endpoints.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06 — Sprint 02: Quarantine Lifecycle State Machine.
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/06-phase-flaky-test-detection-quarantine.md
4. planning/sprints/P06-S02-quarantine-lifecycle-state-machine.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P06_S02.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P06-S02.md and update task.md.
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
