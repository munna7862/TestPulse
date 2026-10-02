# Phase 10 — Sprint 03: Performance and Load Testing

## Sprint Objective

Validate performance SLAs under load: API throughput, WebSocket concurrency, and dashboard render performance.

## Dependencies

P10-S02 E2E hardening.

## Scope

### Granular Implementation Tasks

1. Set up k6 or Artillery for API load testing.
2. Load test: 1000 concurrent API requests (ingestion endpoint).
3. Load test: 100 concurrent WebSocket connections receiving events.
4. Load test: 10,000 test results ingestion in single batch.
5. Benchmark dashboard initial load time (Lighthouse, target < 2s LCP).
6. Identify and fix slow database queries (pg_stat_statements).
7. Profile and optimize WebSocket event throughput.
8. Document performance baselines for regression detection.

## Expected Files / Areas

`tests/performance/`, `docs/performance-baselines.md`

## Testing & Verification

Run all load tests. Verify SLAs are met. Document baseline metrics.

## Acceptance Criteria

- [ ] API p95 response time < 300ms under 1000 concurrent requests.
- [ ] WebSocket latency < 200ms with 100 concurrent connections.
- [ ] 10,000 results ingestion completes in under 5 seconds.
- [ ] Dashboard LCP < 2 seconds.
- [ ] All slow queries are identified and optimized.
- [ ] Performance baselines are documented.

## Risks / Guardrails

Load tests crashing staging environment; performance issues only visible at scale; missing connection pooling.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10, Sprint 03: Performance and Load Testing.

OBJECTIVE:
Validate performance SLAs under load: API throughput, WebSocket concurrency, and dashboard render performance.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Set up k6 or Artillery for API load testing.
2. Load test: 1000 concurrent API requests (ingestion endpoint).
3. Load test: 100 concurrent WebSocket connections receiving events.
4. Load test: 10,000 test results ingestion in single batch.
5. Benchmark dashboard initial load time (Lighthouse, target < 2s LCP).
6. Identify and fix slow database queries (pg_stat_statements).
7. Profile and optimize WebSocket event throughput.
8. Document performance baselines for regression detection.

TEST:
Run all load tests. Verify SLAs are met. Document baseline metrics.

ACCEPTANCE:
- [ ] API p95 response time < 300ms under 1000 concurrent requests.
- [ ] WebSocket latency < 200ms with 100 concurrent connections.
- [ ] 10,000 results ingestion completes in under 5 seconds.
- [ ] Dashboard LCP < 2 seconds.
- [ ] All slow queries are identified and optimized.
- [ ] Performance baselines are documented.

GUARDRAILS:
Load tests crashing staging environment; performance issues only visible at scale; missing connection pooling.

At completion:
- Run the relevant verification commands.
- Report changed files.
- Report tests executed and results.
- Report known limitations.
- Do not suppress or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Tests added or updated for changed behavior.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Relevant tests pass.
- [ ] Build passes when applicable.
- [ ] Acceptance criteria verified.
- [ ] Git diff reviewed.
- [ ] Documentation updated when behavior or architecture changed.
- [ ] Sprint can be handed to the next sprint without hidden manual steps.
