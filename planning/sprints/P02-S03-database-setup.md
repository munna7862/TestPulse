# Phase 02 — Sprint 03: Database Setup (Prisma + PostgreSQL + Redis)

## Sprint Objective

Set up Prisma ORM with PostgreSQL, create the initial schema, and configure Redis client for caching and pub/sub.

## Dependencies

P02-S02 frontend and backend scaffolding.

## Scope

### Granular Implementation Tasks

1. Initialize Prisma in packages/db with PostgreSQL provider.
2. Create initial schema with User and Organization models.
3. Configure database connection with connection pooling.
4. Run initial migration and verify schema applies.
5. Set up Redis client (ioredis) in packages/shared.
6. Create database seed script with test data.
7. Configure separate database URLs for dev, test, and production.
8. Add database health check to API server.

## Expected Files / Areas

`packages/db/`, `packages/shared/src/redis.ts`

## Testing & Verification

Run migration, verify seed data, test Redis connection, verify health check includes database status.

## Acceptance Criteria

- [ ] Prisma migrations run successfully.
- [ ] Seed script populates test data.
- [ ] Redis client connects and performs basic operations.
- [ ] API health check includes database and Redis status.
- [ ] Separate database URLs are configured per environment.

## Risks / Guardrails

Leaked database credentials; missing connection pooling; Redis connection not properly closed on shutdown.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02, Sprint 03: Database Setup (Prisma + PostgreSQL + Redis).

OBJECTIVE:
Set up Prisma ORM with PostgreSQL, create the initial schema, and configure Redis client for caching and pub/sub.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Initialize Prisma in packages/db with PostgreSQL provider.
2. Create initial schema with User and Organization models.
3. Configure database connection with connection pooling.
4. Run initial migration and verify schema applies.
5. Set up Redis client (ioredis) in packages/shared.
6. Create database seed script with test data.
7. Configure separate database URLs for dev, test, and production.
8. Add database health check to API server.

TEST:
Run migration, verify seed data, test Redis connection, verify health check includes database status.

ACCEPTANCE:
- [ ] Prisma migrations run successfully.
- [ ] Seed script populates test data.
- [ ] Redis client connects and performs basic operations.
- [ ] API health check includes database and Redis status.
- [ ] Separate database URLs are configured per environment.

GUARDRAILS:
Leaked database credentials; missing connection pooling; Redis connection not properly closed on shutdown.

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
