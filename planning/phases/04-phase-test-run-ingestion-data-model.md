# Phase 04 — Test Run Ingestion & Data Model

← [Phase 03](./03-phase-authentication-multi-tenancy.md) | [Phase 05 →](./05-phase-real-time-dashboard.md)

## Objective

Build the core data pipeline: CI reporters stream test results to TestPulse **while tests are running**, and TestPulse persists, deduplicates, indexes, and makes them queryable.

## Outcome

A sharded Playwright or Vitest suite running in CI streams results to TestPulse via an API key; results are persisted batch-by-batch, published as real-time events, and queryable via API.

## Scope

- Prisma schema for test suites, test cases, test runs, and test results (master plan §5)
- Incremental ingestion API (master plan §4.2): start run → result batches → complete
- Shard support (`externalRunId`), idempotent retries, field limits
- Test case fingerprinting (cross-platform) and auto-discovery
- Run metadata capture (CI provider, job URL, branch, commit SHA, environment)
- `RealtimePublisher` (redis-emitter) publishing `run:*` events after commit
- Test case history and run query APIs with cursor pagination
- `@testpulse/reporter` for Playwright and Vitest
- Monthly run quotas, ingestion rate limits, stale-run reaper
- Data retention (project setting capped by plan)

## Architecture

```text
CI Reporter (Playwright/Vitest, one instance per shard)
        |
        | 1. POST /api/v1/ingest/runs                  (idempotent on externalRunId)
        | 2. POST /api/v1/ingest/runs/:runId/results   (every ~1s / 200 results)
        | 3. POST /api/v1/ingest/runs/:runId/complete
        | Headers: Authorization: Bearer tp_live_<key>
        v
  Ingestion routes
        |
        +---> authenticateApiKey -> { orgId, projectId }  (never from path/body)
        +---> Zod validation (batch <= 1,000 items, <= 5 MB)
        +---> quota + rate limit
        +---> transaction: upsert suites/cases by fingerprint, upsert results (runId, testCaseId), counters
        +---> after commit: RealtimePublisher.emit(run:started | run:progress | run:completed)
        +---> on completion: enqueue flaky-analysis job + domain events
```

## Data Model

Canonical definitions live in master plan §5 (`TestSuite`, `TestCase`, `TestRun`, `TestResult` and their indexes). Do not redefine them here; propose changes via ADR + master plan update.

## Testing

- Unit tests for fingerprinting, path normalization, and ingestion validation
- Integration tests for the full ingestion pipeline (start → batches → complete → query), including concurrent shards and retried batches
- Reporter integration tests with real Playwright/Vitest example projects, and chaos tests (API down/slow/429)
- Load tests for batch ingestion (10,000 results)
- Tests for API key scoping, quotas, and authorization

## Acceptance Criteria

- [ ] CI reporters stream results via the incremental API while tests run.
- [ ] Sharded runs are combined into one run; retries are idempotent.
- [ ] Results are persisted with full metadata.
- [ ] Test cases are auto-discovered and deduplicated identically on Windows and Linux runners.
- [ ] History and run queries work with cursor pagination.
- [ ] Batch ingestion meets the master plan §10 throughput target.
- [ ] API key authentication, quotas, and rate limits are enforced, and never fail customer CI.
- [ ] Data retention honors project settings and plan maximums.

## Exit Criteria

A sharded Playwright test suite runs in CI, streams results to TestPulse as one run, and the data is queryable via API before the CI job finishes.

## Sprint Decomposition

- P04-S01: Database schema design and Prisma migrations
- P04-S02: Incremental test run ingestion API
- P04-S03: Test case fingerprinting and auto-discovery
- P04-S04: History timeline and query APIs
- P04-S05: CI reporter npm package (Playwright + Vitest)
- P04-S06: Ingestion performance, quotas and data retention
