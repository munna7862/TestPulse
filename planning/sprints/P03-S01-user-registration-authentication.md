# Phase 03 — Sprint 01: User Registration and Email/Password Authentication

## Sprint Objective

Implement user registration, login, and JWT-based session management with email/password credentials.

## Dependencies

Phase 02 complete (monorepo, database, API scaffolding).

## Scope

### Granular Implementation Tasks

1. Create User Prisma model (id, email, passwordHash, name, avatar, createdAt, updatedAt).
2. Implement password hashing with bcrypt (cost factor 12).
3. Create POST /api/v1/auth/register endpoint with Zod validation.
4. Create POST /api/v1/auth/login endpoint returning JWT + refresh token.
5. Create POST /api/v1/auth/refresh endpoint for token rotation.
6. Create POST /api/v1/auth/logout endpoint (invalidate refresh token).
7. Implement JWT middleware for protected routes.
8. Create GET /api/v1/auth/me endpoint for current user profile.
9. Implement password reset flow (request + confirm with token).

## Expected Files / Areas

`packages/db/prisma/schema.prisma`, `apps/api/src/modules/auth/`

## Testing & Verification

Unit tests for password hashing, JWT generation/verification. Integration tests for register, login, refresh, logout, and password reset flows.

## Acceptance Criteria

- [ ] Users can register with email and password.
- [ ] Login returns valid JWT and refresh token.
- [ ] Token refresh works and rotates the refresh token.
- [ ] Logout invalidates the refresh token.
- [ ] Password reset flow works end-to-end.
- [ ] Protected routes reject unauthenticated requests.

## Risks / Guardrails

Weak password policy; JWT secret in source code; refresh token reuse vulnerability.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03, Sprint 01: User Registration and Email/Password Authentication.

OBJECTIVE:
Implement user registration, login, and JWT-based session management with email/password credentials.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create User Prisma model (id, email, passwordHash, name, avatar, createdAt, updatedAt).
2. Implement password hashing with bcrypt (cost factor 12).
3. Create POST /api/v1/auth/register endpoint with Zod validation.
4. Create POST /api/v1/auth/login endpoint returning JWT + refresh token.
5. Create POST /api/v1/auth/refresh endpoint for token rotation.
6. Create POST /api/v1/auth/logout endpoint (invalidate refresh token).
7. Implement JWT middleware for protected routes.
8. Create GET /api/v1/auth/me endpoint for current user profile.
9. Implement password reset flow (request + confirm with token).

TEST:
Unit tests for password hashing, JWT generation/verification. Integration tests for register, login, refresh, logout, and password reset flows.

ACCEPTANCE:
- [ ] Users can register with email and password.
- [ ] Login returns valid JWT and refresh token.
- [ ] Token refresh works and rotates the refresh token.
- [ ] Logout invalidates the refresh token.
- [ ] Password reset flow works end-to-end.
- [ ] Protected routes reject unauthenticated requests.

GUARDRAILS:
Weak password policy; JWT secret in source code; refresh token reuse vulnerability.

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
