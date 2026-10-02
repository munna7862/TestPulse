# Phase 04 — Sprint 01: Database Schema Design and Prisma Migrations

## Sprint Objective

Design and implement the complete database schema for test suites, test cases, test runs, and run results.

## Dependencies

Phase 03 complete (auth, orgs, projects).

## Scope

### Granular Implementation Tasks

1. Create TestSuite model (id, projectId, name, filePath, createdAt, updatedAt).
2. Create TestCase model (id, suiteId, name, fullName, tags, status, createdAt).
3. Create TestRun model (id, projectId, branch, commitSha, ciProvider, environment, startedAt, finishedAt, status, totalTests, passed, failed, skipped).
4. Create RunResult model (id, runId, testCaseId, status enum, duration, errorMessage, errorStack, retryCount).
5. Define indexes for common query patterns (projectId+createdAt, testCaseId+runId).
6. Create and run Prisma migrations.
7. Update seed script with test run sample data.

## Expected Files / Areas

`packages/db/prisma/schema.prisma`, `packages/db/prisma/seed.ts`

## Testing & Verification

Run migrations on clean database. Verify seed data. Test query patterns with explain analyze.

## Acceptance Criteria

- [ ] All models are created with correct relationships.
- [ ] Indexes are defined for common query patterns.
- [ ] Migrations run successfully on clean database.
- [ ] Seed script creates realistic test data.
- [ ] Foreign key constraints enforce data integrity.

## Risks / Guardrails

Missing indexes on high-cardinality columns; over-normalized schema; missing cascade deletes.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04, Sprint 01: Database Schema Design and Prisma Migrations.

OBJECTIVE:
Design and implement the complete database schema for test suites, test cases, test runs, and run results.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create TestSuite model (id, projectId, name, filePath, createdAt, updatedAt).
2. Create TestCase model (id, suiteId, name, fullName, tags, status, createdAt).
3. Create TestRun model (id, projectId, branch, commitSha, ciProvider, environment, startedAt, finishedAt, status, totalTests, passed, failed, skipped).
4. Create RunResult model (id, runId, testCaseId, status enum, duration, errorMessage, errorStack, retryCount).
5. Define indexes for common query patterns (projectId+createdAt, testCaseId+runId).
6. Create and run Prisma migrations.
7. Update seed script with test run sample data.

TEST:
Run migrations on clean database. Verify seed data. Test query patterns with explain analyze.

ACCEPTANCE:
- [ ] All models are created with correct relationships.
- [ ] Indexes are defined for common query patterns.
- [ ] Migrations run successfully on clean database.
- [ ] Seed script creates realistic test data.
- [ ] Foreign key constraints enforce data integrity.

GUARDRAILS:
Missing indexes on high-cardinality columns; over-normalized schema; missing cascade deletes.

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
