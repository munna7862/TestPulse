# Phase 04 — Sprint 06: Batch Performance Optimization and Data Retention

## Sprint Objective

Optimize ingestion performance for large test suites and implement configurable data retention policies.

## Dependencies

P04-S05 CI reporter.

## Scope

### Granular Implementation Tasks

1. Benchmark ingestion performance with 10,000+ results per run.
2. Optimize database writes with batch inserts and transactions.
3. Implement configurable data retention per project (7, 30, 90 days).
4. Create background job (BullMQ) for data cleanup based on retention policy.
5. Add ingestion rate limiting per API key (configurable).
6. Implement ingestion progress tracking for large batches.
7. Add database query performance monitoring (slow query logging).

## Expected Files / Areas

`apps/api/src/modules/runs/`, `apps/api/src/jobs/`

## Testing & Verification

Load tests for batch ingestion. Integration tests for data retention cleanup. Performance benchmarks.

## Acceptance Criteria

- [ ] 10,000+ results are ingested in under 5 seconds.
- [ ] Data retention policy deletes old data correctly.
- [ ] Background cleanup job runs on schedule.
- [ ] Ingestion rate limiting prevents abuse.
- [ ] Slow queries are logged for optimization.

## Risks / Guardrails

Cleanup job accidentally deleting recent data; rate limit too aggressive; transaction timeouts on large batches.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04, Sprint 06: Batch Performance Optimization and Data Retention.

OBJECTIVE:
Optimize ingestion performance for large test suites and implement configurable data retention policies.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Benchmark ingestion performance with 10,000+ results per run.
2. Optimize database writes with batch inserts and transactions.
3. Implement configurable data retention per project (7, 30, 90 days).
4. Create background job (BullMQ) for data cleanup based on retention policy.
5. Add ingestion rate limiting per API key (configurable).
6. Implement ingestion progress tracking for large batches.
7. Add database query performance monitoring (slow query logging).

TEST:
Load tests for batch ingestion. Integration tests for data retention cleanup. Performance benchmarks.

ACCEPTANCE:
- [ ] 10,000+ results are ingested in under 5 seconds.
- [ ] Data retention policy deletes old data correctly.
- [ ] Background cleanup job runs on schedule.
- [ ] Ingestion rate limiting prevents abuse.
- [ ] Slow queries are logged for optimization.

GUARDRAILS:
Cleanup job accidentally deleting recent data; rate limit too aggressive; transaction timeouts on large batches.

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
