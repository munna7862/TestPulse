# Phase 04 — Sprint 06: Ingestion Performance, Quotas & Data Retention

## Sprint Objective

Meet the ingestion throughput target, enforce run quotas and rate limits, and implement retention cleanup and the stale-run reaper.

## Dependencies

P04-S05 CI reporter (used to drive realistic load), P02-S03 job queue skeleton.

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-devops-engineer`, `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Benchmark 10,000 results (10 × 1,000 batches) and record the baseline in `docs/testing/performance-baselines.md`.
2. Optimize writes: bulk upsert SQL, minimal round trips, and one transaction per batch.
3. Enforce the monthly run quota per org (runs created per UTC calendar month): return `429 QUOTA_EXCEEDED` on run start, and expose `GET /api/v1/orgs/:orgId/usage` for the dashboard banner.
4. Tune the per-key and per-project ingestion rate limits.
5. Retention: effective retention = `min(project.retentionDays, plan maximum)`. A daily BullMQ job deletes expired `TestResult`/`TestRun` rows in chunks, avoiding long locks.
6. Stale-run reaper (every 5 minutes): `RUNNING` runs with no activity for 30 minutes become `TIMED_OUT` and emit `run:completed`.
7. Slow-query logging (Prisma query events > 200 ms) with tenant context.

## Expected Files / Areas

`apps/api/src/modules/ingest/`, `apps/api/src/jobs/retention.ts`, `apps/api/src/jobs/run-reaper.ts`, `docs/testing/performance-baselines.md`

## Testing & Verification

Load test of batch ingestion against the master plan §10 target. Integration tests for retention (only expired data deleted; plan maximum respected), the reaper, and quota boundaries (500th run accepted, 501st rejected for Free).

## Acceptance Criteria

- [ ] 10,000 results are ingested in under 5 seconds (measured, with the baseline documented).
- [ ] Retention deletes only data older than the effective retention.
- [ ] Quota and rate-limit responses work, and the reporter treats them as non-fatal.
- [ ] Abandoned runs are marked TIMED_OUT.
- [ ] Slow queries are logged for optimization.

## Risks / Guardrails

Cleanup job deleting recent data (timezone or plan bugs); rate limits too aggressive for large sharded suites; long-running deletes locking tables; transaction timeouts on large batches.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04 — Sprint 06: Ingestion Performance, Quotas & Data Retention.
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-devops-engineer, role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/04-phase-test-run-ingestion-data-model.md
4. planning/sprints/P04-S06-batch-performance-data-retention.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P04_S06.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P04-S06.md and update task.md.
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
