# Phase 04 — Test Run Ingestion & Data Model

← [Phase 03](./03-phase-authentication-multi-tenancy.md) | [Phase 05 →](./05-phase-real-time-dashboard.md)

## Objective

Build the core data pipeline: CI reporters send test results to TestPulse, which persists, indexes, and makes them queryable.

## Outcome

A CI pipeline can POST test results to TestPulse via API key, and the data appears in the database ready for dashboard consumption.

## Scope

- Prisma schema for test suites, test cases, test runs, and run results
- REST API for test run ingestion (`POST /api/v1/runs`)
- Batch result ingestion (support 10,000+ results per run)
- Test case deduplication and auto-discovery
- Run metadata capture (CI provider, branch, commit SHA, duration, environment)
- Test case history timeline queries
- Pagination and filtering APIs
- CI reporter package (npm) for Playwright/Vitest
- Database indexing strategy for query performance
- Data retention policies (configurable per project)

## Architecture

```text
CI Reporter (npm package)
        |
        | POST /api/v1/runs
        | Headers: X-API-Key: <project-api-key>
        | Body: { results: [...], metadata: {...} }
        v
  Ingestion Controller
        |
        +---> Validate API key + extract project context
        +---> Validate payload (Zod schema)
        +---> Upsert test suites and test cases
        +---> Insert run + run results (batch)
        +---> Emit event to Redis pub/sub
        +---> Return 201 Created
```

## Data Model

```text
TestSuite:     id, projectId, name, filePath, createdAt
TestCase:      id, suiteId, name, fullName, tags[], createdAt
TestRun:       id, projectId, branch, commitSha, ciProvider, startedAt, finishedAt, status, totalTests, passed, failed, skipped
RunResult:     id, runId, testCaseId, status (passed|failed|skipped|flaky), duration, errorMessage, errorStack, retryCount
```

## Testing

- Unit tests for ingestion validation and deduplication logic
- Integration tests for full ingestion pipeline (API -> DB -> query)
- Load tests for batch ingestion (10,000 results)
- Tests for API key scoping and authorization

## Acceptance Criteria

- [ ] CI reporter can send test results via REST API.
- [ ] Results are persisted with full metadata.
- [ ] Test cases are auto-discovered and deduplicated.
- [ ] History timeline queries work with pagination.
- [ ] Batch ingestion handles 10,000+ results efficiently.
- [ ] API key authentication is enforced.
- [ ] Data retention policies are configurable.

## Exit Criteria

A Playwright test suite can run in CI, report results to TestPulse, and the data is queryable via API.

## Sprint Decomposition

- P04-S01: Database schema design and Prisma migrations
- P04-S02: Test run ingestion API endpoint
- P04-S03: Test case deduplication and auto-discovery
- P04-S04: History timeline and query APIs
- P04-S05: CI reporter npm package (Playwright/Vitest)
- P04-S06: Batch performance optimization and data retention
