# Phase 03 — Sprint 04: Invitation Flow and Role-Based Access Control

## Sprint Objective

Implement team member invitation, acceptance, and comprehensive RBAC enforcement on all API endpoints.

## Dependencies

P03-S03 organization CRUD.

## Scope

### Granular Implementation Tasks

1. Create Invitation Prisma model (id, orgId, email, role, token, expiresAt, status).
2. Create POST /api/v1/orgs/:orgId/invitations endpoint (Admin+ can invite).
3. Implement invitation email delivery (or token-based link for MVP).
4. Create POST /api/v1/invitations/:token/accept endpoint.
5. Create RBAC middleware with permission checking.
6. Define permission matrix: who can create/read/update/delete each resource.
7. Implement role change (Admin+ can change member roles, except OWNER).
8. Implement member removal (Admin+ can remove, except OWNER).

## Expected Files / Areas

`apps/api/src/middleware/rbac.ts`, `apps/api/src/modules/invitations/`

## Testing & Verification

Unit tests for RBAC permission matrix. Integration tests for invitation lifecycle. Security tests for privilege escalation.

## Acceptance Criteria

- [ ] Admin+ can invite new members.
- [ ] Invited users can accept and join the organization.
- [ ] RBAC is enforced on all API endpoints.
- [ ] Members cannot escalate their own role.
- [ ] OWNER cannot be removed or have role changed.
- [ ] Expired invitations cannot be accepted.

## Risks / Guardrails

Privilege escalation via direct API manipulation; invitation token reuse; missing RBAC on new endpoints.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03, Sprint 04: Invitation Flow and Role-Based Access Control.

OBJECTIVE:
Implement team member invitation, acceptance, and comprehensive RBAC enforcement on all API endpoints.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create Invitation Prisma model (id, orgId, email, role, token, expiresAt, status).
2. Create POST /api/v1/orgs/:orgId/invitations endpoint (Admin+ can invite).
3. Implement invitation email delivery (or token-based link for MVP).
4. Create POST /api/v1/invitations/:token/accept endpoint.
5. Create RBAC middleware with permission checking.
6. Define permission matrix: who can create/read/update/delete each resource.
7. Implement role change (Admin+ can change member roles, except OWNER).
8. Implement member removal (Admin+ can remove, except OWNER).

TEST:
Unit tests for RBAC permission matrix. Integration tests for invitation lifecycle. Security tests for privilege escalation.

ACCEPTANCE:
- [ ] Admin+ can invite new members.
- [ ] Invited users can accept and join the organization.
- [ ] RBAC is enforced on all API endpoints.
- [ ] Members cannot escalate their own role.
- [ ] OWNER cannot be removed or have role changed.
- [ ] Expired invitations cannot be accepted.

GUARDRAILS:
Privilege escalation via direct API manipulation; invitation token reuse; missing RBAC on new endpoints.

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
