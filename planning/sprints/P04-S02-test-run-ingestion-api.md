# Phase 04 — Sprint 02: Incremental Test Run Ingestion API

## Sprint Objective

Implement the incremental ingestion protocol (master plan §4.2) so CI reporters can stream results while tests are still running.

## Dependencies

P04-S01 database schema.

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-fullstack-architect`, `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Add Zod schemas in `@testpulse/shared` for `StartRunBody` (including optional `expectedTestCount`), `ResultsBatchBody` (≤ 1,000 items with field limits), `CompleteRunBody`, their responses, and the ingestion error codes.
2. `POST /api/v1/ingest/runs`: idempotent on `(projectId, externalRunId)`, so concurrent shards join one run. Allocate `runNumber` atomically. Emit `run:started` on create only.
3. `POST /api/v1/ingest/runs/:runId/results`: upsert suites and cases by fingerprint (P04-S03 hardens this) and results on `(runId, testCaseId)`. Update counters and `lastActivityAt`. Enforce a 5 MB body limit. Reject the whole batch on validation failure with per-index errors.
4. `POST /api/v1/ingest/runs/:runId/complete`: track shard completion. When all shards are done, compute the final status, emit `run:completed`, enqueue the `flaky-analysis` job (a no-op processor until P06-S01), and enqueue the `run.failed` / `run.recovered` domain events.
5. `GET /api/v1/ingest/quarantined-tests` (returns an empty list until Phase 06).
6. Implement `RealtimePublisher` (a wrapper around `@socket.io/redis-emitter`, Zod-validating the run event schemas). Events are emitted only after commit. The gateway that delivers them arrives in P05-S01.
7. Return 404 for runs that belong to another project and 409 for results sent to a completed run.

## Expected Files / Areas

`apps/api/src/modules/ingest/`, `apps/api/src/realtime/publisher.ts`, `packages/shared/src/schemas/ingest.ts`, `packages/shared/src/events/`, `docs/api/ingestion.md`

## Testing & Verification

Integration tests: the happy path across three calls; two shards joining one run; a retried batch being idempotent (counters unchanged); an invalid batch rejected with per-index errors; 401 for a bad key; 404 for another project's run; 409 after completion. Unit tests confirm events are published only after commit (publisher fake).

## Acceptance Criteria

- [ ] A CI run can start, stream result batches, and complete via an API key.
- [ ] Parallel shards with the same `externalRunId` produce one run with combined results.
- [ ] Retried batches do not create duplicates or double-count.
- [ ] Invalid payloads return descriptive per-item errors.
- [ ] `run:started`, `run:progress`, and `run:completed` events are published after commit with lean payloads.
- [ ] Requests with a missing, revoked, or wrong-project key are rejected.

## Risks / Guardrails

Accepting unbounded payload sizes; emitting events before commit; race conditions between concurrent shards (rely on unique constraints, not read-then-write); results arriving after completion.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04 — Sprint 02: Incremental Test Run Ingestion API.
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-fullstack-architect, role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/04-phase-test-run-ingestion-data-model.md
4. planning/sprints/P04-S02-test-run-ingestion-api.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P04_S02.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P04-S02.md and update task.md.
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
