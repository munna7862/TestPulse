# Phase 03 — Authentication & Multi-Tenancy

← [Phase 02](./02-phase-project-bootstrap-devops.md) | [Phase 04 →](./04-phase-test-run-ingestion-data-model.md)

## Objective

Implement a secure, multi-tenant authentication and authorization system that supports individual users, organizations, and role-based access control.

## Outcome

Users can sign up, log in, create organizations, invite team members, and operate within isolated tenant boundaries with appropriate permissions.

## Scope

- User registration and login (email/password + OAuth)
- OAuth providers (Google, GitHub)
- JWT + refresh token lifecycle
- Organization CRUD
- Organization membership and invitation flow
- Role-based access control (Owner, Admin, Member, Viewer)
- Project creation within organizations
- API key generation and management
- Tenant isolation at the database query level
- Session management and security

## Architecture

```text
Auth Flow:
  Browser -> Next.js Auth Route -> Auth Provider -> JWT
         |
         v
  API Request -> JWT Verification -> Tenant Context Middleware -> Business Logic
         |
         v
  Database Query -> WHERE org_id = <tenant_id> (row-level isolation)
```

## Business Rules

- Every user belongs to at least one organization.
- The user who creates an organization is automatically the Owner.
- Owners can transfer ownership but cannot be removed.
- API keys are scoped to a project, not an organization.
- API keys can only write (ingest) data, never read organization data.
- Deleted users' data is preserved but anonymized.

## Testing

- Unit tests for RBAC permission checks
- Integration tests for auth flow (register, login, refresh, logout)
- Integration tests for invitation flow
- E2E tests for sign-up to project creation journey
- Security tests for tenant isolation (user A cannot access user B data)

## Acceptance Criteria

- [ ] Users can register via email and OAuth (Google, GitHub).
- [ ] JWT + refresh tokens are issued and rotated correctly.
- [ ] Organizations can be created, updated, and members invited.
- [ ] RBAC is enforced on all API endpoints.
- [ ] API keys can be generated and used for CI integrations.
- [ ] Tenant isolation is verified with cross-tenant access tests.
- [ ] Password reset flow works end-to-end.

## Exit Criteria

A user can sign up, create an org, invite a teammate, and both can access only their own organization data.

## Sprint Decomposition

- P03-S01: User registration and email/password authentication
- P03-S02: OAuth integration (Google + GitHub)
- P03-S03: Organization CRUD and membership model
- P03-S04: Invitation flow and role-based access control
- P03-S05: API key generation and management
- P03-S06: Tenant isolation verification and security hardening
