# Phase 03 — Sprint 03: Organization CRUD and Membership Model

## Sprint Objective

Implement organization creation, settings management, and the membership model connecting users to organizations.

## Dependencies

P03-S02 OAuth integration.

## Scope

### Granular Implementation Tasks

1. Create Organization Prisma model (id, name, slug, logo, createdAt).
2. Create Membership Prisma model (userId, orgId, role enum: OWNER/ADMIN/MEMBER/VIEWER).
3. Create POST /api/v1/orgs endpoint (create org, caller becomes OWNER).
4. Create GET /api/v1/orgs endpoint (list user memberships).
5. Create GET /api/v1/orgs/:orgId endpoint (org details + members).
6. Create PATCH /api/v1/orgs/:orgId endpoint (update org settings).
7. Implement org context middleware (extract orgId from route, verify membership).
8. Auto-create a default organization on first user registration.

## Expected Files / Areas

`packages/db/prisma/schema.prisma`, `apps/api/src/modules/orgs/`

## Testing & Verification

Integration tests for org CRUD. Authorization tests verifying role-based access.

## Acceptance Criteria

- [ ] Users can create organizations.
- [ ] Organization creator is automatically OWNER.
- [ ] Users can list their organizations.
- [ ] Org details include member list with roles.
- [ ] Org settings can be updated by ADMIN+.
- [ ] Non-members cannot access org endpoints.

## Risks / Guardrails

Missing tenant context in queries; OWNER role accidentally removable; org slug collisions.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03, Sprint 03: Organization CRUD and Membership Model.

OBJECTIVE:
Implement organization creation, settings management, and the membership model connecting users to organizations.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create Organization Prisma model (id, name, slug, logo, createdAt).
2. Create Membership Prisma model (userId, orgId, role enum: OWNER/ADMIN/MEMBER/VIEWER).
3. Create POST /api/v1/orgs endpoint (create org, caller becomes OWNER).
4. Create GET /api/v1/orgs endpoint (list user memberships).
5. Create GET /api/v1/orgs/:orgId endpoint (org details + members).
6. Create PATCH /api/v1/orgs/:orgId endpoint (update org settings).
7. Implement org context middleware (extract orgId from route, verify membership).
8. Auto-create a default organization on first user registration.

TEST:
Integration tests for org CRUD. Authorization tests verifying role-based access.

ACCEPTANCE:
- [ ] Users can create organizations.
- [ ] Organization creator is automatically OWNER.
- [ ] Users can list their organizations.
- [ ] Org details include member list with roles.
- [ ] Org settings can be updated by ADMIN+.
- [ ] Non-members cannot access org endpoints.

GUARDRAILS:
Missing tenant context in queries; OWNER role accidentally removable; org slug collisions.

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
