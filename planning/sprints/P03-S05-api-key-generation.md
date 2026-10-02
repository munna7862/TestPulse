# Phase 03 — Sprint 05: API Key Generation and Management

## Sprint Objective

Implement project-scoped API key generation, validation, and management for CI integration authentication.

## Dependencies

P03-S04 RBAC enforcement.

## Scope

### Granular Implementation Tasks

1. Create Project Prisma model (id, orgId, name, description, createdAt).
2. Create ApiKey Prisma model (id, projectId, name, keyHash, prefix, lastUsedAt, createdAt).
3. Create POST /api/v1/projects/:projectId/api-keys endpoint (Admin+ can create).
4. Display the full API key only once on creation (never stored in plain text).
5. Create DELETE /api/v1/projects/:projectId/api-keys/:keyId endpoint.
6. Implement API key authentication middleware (X-API-Key header).
7. API key resolves to project context (projectId, orgId) for downstream use.
8. Create GET /api/v1/projects/:projectId/api-keys endpoint (list keys, masked).

## Expected Files / Areas

`packages/db/prisma/schema.prisma`, `apps/api/src/middleware/apiKey.ts`

## Testing & Verification

Integration tests for key generation, validation, and deletion. Security tests verifying keys cannot read org data.

## Acceptance Criteria

- [ ] API keys can be generated for projects.
- [ ] Full key is displayed only once on creation.
- [ ] API key authenticates requests and resolves project context.
- [ ] Deleted keys are immediately invalidated.
- [ ] API keys cannot access org-level endpoints.
- [ ] Key listing shows masked keys (prefix only).

## Risks / Guardrails

Storing API keys in plain text; API key scope too broad; missing rate limiting on key-authenticated endpoints.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03, Sprint 05: API Key Generation and Management.

OBJECTIVE:
Implement project-scoped API key generation, validation, and management for CI integration authentication.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create Project Prisma model (id, orgId, name, description, createdAt).
2. Create ApiKey Prisma model (id, projectId, name, keyHash, prefix, lastUsedAt, createdAt).
3. Create POST /api/v1/projects/:projectId/api-keys endpoint (Admin+ can create).
4. Display the full API key only once on creation (never stored in plain text).
5. Create DELETE /api/v1/projects/:projectId/api-keys/:keyId endpoint.
6. Implement API key authentication middleware (X-API-Key header).
7. API key resolves to project context (projectId, orgId) for downstream use.
8. Create GET /api/v1/projects/:projectId/api-keys endpoint (list keys, masked).

TEST:
Integration tests for key generation, validation, and deletion. Security tests verifying keys cannot read org data.

ACCEPTANCE:
- [ ] API keys can be generated for projects.
- [ ] Full key is displayed only once on creation.
- [ ] API key authenticates requests and resolves project context.
- [ ] Deleted keys are immediately invalidated.
- [ ] API keys cannot access org-level endpoints.
- [ ] Key listing shows masked keys (prefix only).

GUARDRAILS:
Storing API keys in plain text; API key scope too broad; missing rate limiting on key-authenticated endpoints.

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
