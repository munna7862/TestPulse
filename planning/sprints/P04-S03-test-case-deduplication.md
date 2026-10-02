# Phase 04 — Sprint 03: Test Case Fingerprinting & Auto-Discovery

## Sprint Objective

Make test case identity stable and cross-platform, so the same test always maps to the same TestCase, and keep upserts fast for large batches.

## Dependencies

P04-S02 ingestion API.

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-fullstack-architect`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Implement the fingerprint from ADR-007: SHA-256 of `runnerProject`, POSIX-normalized `filePath`, and `titlePath`, joined with a NUL separator.
2. Add a path normalization utility in `@testpulse/shared` (backslash → slash, strip the repository root, reject absolute paths). The reporter uses it, and the API re-normalizes defensively.
3. Batch upsert: `createMany({ skipDuplicates: true })` for suites and cases, then one `findMany` to map identifiers to IDs. No per-result queries.
4. Update `lastStatus`, `lastSeenAt`, and runner `tags` (latest wins).
5. Treat renamed or moved tests as new test cases (documented limitation, Q6).
6. Make concurrent shards that insert the same new case safe (no duplicates, no errors).
7. `GET /api/v1/projects/:projectId/test-cases`: cursor pagination; filters for status, flaky state, quarantined, suite, and title search.
8. Benchmark 10 batches × 1,000 brand-new test cases.

## Expected Files / Areas

`packages/shared/src/fingerprint.ts`, `apps/api/src/modules/ingest/upsert.ts`, `apps/api/src/modules/test-cases/`

## Testing & Verification

Unit tests for fingerprinting (the same test from Windows and Linux paths gives the same identifier; different Playwright projects give different identifiers). Integration tests for auto-discovery and concurrent shard inserts. Performance benchmark for batch upsert.

## Acceptance Criteria

- [ ] The same test across runs, shards, and operating systems maps to the same TestCase.
- [ ] Test suites are auto-created from normalized file paths.
- [ ] The test case list endpoint supports pagination and filtering.
- [ ] A batch of 1,000 new results completes within the master plan §10 throughput budget.
- [ ] Test case status reflects the latest result.

## Risks / Guardrails

Fingerprint collisions or instability (e.g. absolute paths, Windows separators); performance degradation on large batches; race conditions on concurrent ingestion.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04 — Sprint 03: Test Case Fingerprinting & Auto-Discovery.
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-fullstack-architect, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/04-phase-test-run-ingestion-data-model.md
4. planning/sprints/P04-S03-test-case-deduplication.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P04_S03.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P04-S03.md and update task.md.
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
