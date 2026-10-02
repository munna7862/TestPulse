# Phase 10 — Sprint 03: Performance and Load Testing

## Sprint Objective

Validate performance SLAs under load: API throughput, WebSocket concurrency, and dashboard render performance.

## Dependencies

P10-S02 E2E hardening.

## Personas

- **Lead:** `role-sdet-architect`, `role-devops-engineer`
- **Reviewers / sign-off:** `role-backend-engineer`, `role-realtime-engineer`

## Scope

### Granular Implementation Tasks

1. Write k6 scenarios for the REST API, ingestion, and WebSocket connections (run against a staging-like environment, never production).
2. Load test: 1,000 concurrent requests on read endpoints.
3. Load test: 1,000 concurrent WebSocket connections per gateway instance receiving `run:progress`.
4. Load test: 10,000 results per run (10 × 1,000 batches) with several sharded runs in parallel.
5. Benchmark dashboard initial load (Lighthouse/Web Vitals).
6. Identify and fix slow database queries (`pg_stat_statements`), and check `TestResult` growth against the partitioning threshold.
7. Profile and optimize WebSocket event throughput.
8. Document performance baselines for regression detection.

## Expected Files / Areas

`tests/performance/`, `docs/testing/performance-baselines.md`

## Testing & Verification

Run all load tests. Verify SLAs are met. Document baseline metrics.

## Acceptance Criteria

- [ ] Every master plan §10 performance target is met and measured: API p95, WebSocket concurrency and latency, ingestion throughput, and dashboard LCP.
- [ ] Slow queries are identified and optimized.
- [ ] Performance baselines are documented with real measurements.

## Risks / Guardrails

Load tests crashing staging environment; performance issues only visible at scale; missing connection pooling.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10 — Sprint 03: Performance and Load Testing.
Act as: role-sdet-architect + role-devops-engineer (load .agents/skills/role-sdet-architect/SKILL.md, .agents/skills/role-devops-engineer/SKILL.md). Reviewers: role-backend-engineer, role-realtime-engineer.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/10-phase-quality-engineering-release.md
4. planning/sprints/P10-S03-performance-load-testing.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P10_S03.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P10-S03.md and update task.md.
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
