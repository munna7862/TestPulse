# Phase 04 — Sprint 03: Test Case Deduplication and Auto-Discovery

## Sprint Objective

Implement automatic test case discovery and deduplication so repeated test names across runs map to the same test case entity.

## Dependencies

P04-S02 ingestion API.

## Scope

### Granular Implementation Tasks

1. Implement test case upsert logic (match on fullName + suiteId or fullName + projectId).
2. Auto-create TestSuite records from file path information in results.
3. Handle test renames gracefully (new name = new test case).
4. Update test case tags from latest run results.
5. Add test case status tracking (last known status: passing, failing, flaky, skipped).
6. Create GET /api/v1/projects/:projectId/test-cases endpoint with pagination and filtering.
7. Implement efficient batch upsert for large result sets (10,000+ results).

## Expected Files / Areas

`apps/api/src/modules/runs/ingestion.service.ts`, `apps/api/src/modules/test-cases/`

## Testing & Verification

Unit tests for deduplication logic. Integration tests for auto-discovery. Performance test for batch upsert.

## Acceptance Criteria

- [ ] Duplicate test names across runs map to the same TestCase.
- [ ] Test suites are auto-created from file paths.
- [ ] Test case list endpoint supports pagination and filtering.
- [ ] Batch upsert handles 10,000+ results efficiently.
- [ ] Test case status reflects the latest run result.

## Risks / Guardrails

Deduplication collisions on similar names; performance degradation on large batches; race conditions on concurrent ingestion.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04, Sprint 03: Test Case Deduplication and Auto-Discovery.

OBJECTIVE:
Implement automatic test case discovery and deduplication so repeated test names across runs map to the same test case entity.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Implement test case upsert logic (match on fullName + suiteId or fullName + projectId).
2. Auto-create TestSuite records from file path information in results.
3. Handle test renames gracefully (new name = new test case).
4. Update test case tags from latest run results.
5. Add test case status tracking (last known status: passing, failing, flaky, skipped).
6. Create GET /api/v1/projects/:projectId/test-cases endpoint with pagination and filtering.
7. Implement efficient batch upsert for large result sets (10,000+ results).

TEST:
Unit tests for deduplication logic. Integration tests for auto-discovery. Performance test for batch upsert.

ACCEPTANCE:
- [ ] Duplicate test names across runs map to the same TestCase.
- [ ] Test suites are auto-created from file paths.
- [ ] Test case list endpoint supports pagination and filtering.
- [ ] Batch upsert handles 10,000+ results efficiently.
- [ ] Test case status reflects the latest run result.

GUARDRAILS:
Deduplication collisions on similar names; performance degradation on large batches; race conditions on concurrent ingestion.

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
