# Phase 04 — Sprint 02: Test Run Ingestion API Endpoint

## Sprint Objective

Implement the core REST API endpoint for CI pipelines to submit test run results.

## Dependencies

P04-S01 database schema.

## Scope

### Granular Implementation Tasks

1. Create POST /api/v1/runs endpoint with API key authentication.
2. Define Zod schema for ingestion payload (results array, metadata object).
3. Validate payload structure and reject malformed requests with clear error messages.
4. Persist TestRun with metadata (branch, commit, CI provider, duration).
5. Persist RunResult records for each test result in the payload.
6. Return 201 Created with run summary (id, total, passed, failed, skipped).
7. Handle partial failures gracefully (some results fail validation).
8. Emit run:created event to Redis pub/sub after successful persistence.

## Expected Files / Areas

`apps/api/src/modules/runs/`, `packages/shared/src/schemas/`

## Testing & Verification

Integration tests for ingestion endpoint (valid payload, invalid payload, auth failures, partial failures).

## Acceptance Criteria

- [ ] CI pipelines can POST test results via API key.
- [ ] Valid payloads are persisted correctly.
- [ ] Invalid payloads return descriptive error messages.
- [ ] Run summary is returned in the response.
- [ ] Redis pub/sub event is emitted on success.
- [ ] Unauthenticated requests are rejected.

## Risks / Guardrails

Accepting unbounded payload sizes; missing validation on nested objects; SQL injection via metadata fields.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04, Sprint 02: Test Run Ingestion API Endpoint.

OBJECTIVE:
Implement the core REST API endpoint for CI pipelines to submit test run results.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create POST /api/v1/runs endpoint with API key authentication.
2. Define Zod schema for ingestion payload (results array, metadata object).
3. Validate payload structure and reject malformed requests with clear error messages.
4. Persist TestRun with metadata (branch, commit, CI provider, duration).
5. Persist RunResult records for each test result in the payload.
6. Return 201 Created with run summary (id, total, passed, failed, skipped).
7. Handle partial failures gracefully (some results fail validation).
8. Emit run:created event to Redis pub/sub after successful persistence.

TEST:
Integration tests for ingestion endpoint (valid payload, invalid payload, auth failures, partial failures).

ACCEPTANCE:
- [ ] CI pipelines can POST test results via API key.
- [ ] Valid payloads are persisted correctly.
- [ ] Invalid payloads return descriptive error messages.
- [ ] Run summary is returned in the response.
- [ ] Redis pub/sub event is emitted on success.
- [ ] Unauthenticated requests are rejected.

GUARDRAILS:
Accepting unbounded payload sizes; missing validation on nested objects; SQL injection via metadata fields.

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
