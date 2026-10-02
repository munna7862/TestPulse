# Phase 06 — Sprint 05: SLA Enforcement, Escalation, and Quarantine Metrics

## Sprint Objective

Enforce quarantine SLAs with idempotent escalation markers and domain events, and compute quarantine health metrics.

## Dependencies

P06-S04 quarantine dashboard.

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Create a repeatable BullMQ SLA monitor job (every 15 minutes) that queries open quarantines by `slaDueAt` (indexed).
2. At 80% of the SLA: set `warnedAt` and enqueue `quarantine.sla_warning` (once).
3. At 100%: set `escalatedAt` and enqueue `quarantine.sla_escalated` (once). Recipients (assignee + project admins) are resolved by the P07 router.
4. At 200%: set `overdueFlaggedAt` and enqueue `quarantine.overdue`.
5. Idempotency and catch-up: markers guarantee each step fires once, even with job retries, overlapping runs, or the free-tier process waking after hours of sleep (an overdue record that missed 80% and 100% gets each marker in order on the next tick). Changing `slaDays` recomputes `slaDueAt` for open records.
6. Metrics from `QuarantineTransition`: MTTR (RESOLVED only; DISMISSED reported separately), open count, and resolution rate.
7. Quarantine health summary card on the project dashboard.
8. SLA setting in project settings (7/14/30/60 days, Admin+).

## Expected Files / Areas

`apps/api/src/jobs/sla-monitor.ts`, `apps/api/src/modules/quarantine/metrics.ts`, `apps/web/src/features/quarantine/`

## Testing & Verification

Integration tests for the SLA job with a fake clock (each threshold fires exactly once, including across retries). Unit tests for MTTR. Notifications are verified end to end in P07-S01.

## Acceptance Criteria

- [ ] The warning, escalation, and overdue markers are set at 80%, 100%, and 200% of the SLA, each exactly once.
- [ ] Matching domain events are enqueued for the notification system.
- [ ] Quarantine metrics (MTTR, resolution rate, open count) are computed correctly.
- [ ] The quarantine health summary appears on the project dashboard.
- [ ] The SLA duration is configurable per project.

## Risks / Guardrails

SLA time zone bugs; the job not running in production (monitor the worker heartbeat); duplicate warnings from non-idempotent processing.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06 — Sprint 05: SLA Enforcement, Escalation, and Quarantine Metrics.
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/06-phase-flaky-test-detection-quarantine.md
4. planning/sprints/P06-S05-sla-enforcement-escalation-metrics.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P06_S05.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P06-S05.md and update task.md.
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
