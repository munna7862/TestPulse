# Phase 03 — Authentication & Multi-Tenancy

← [Phase 02](./02-phase-project-bootstrap-devops.md) | [Phase 04 →](./04-phase-test-run-ingestion-data-model.md)

## Objective

Implement a secure, multi-tenant authentication and authorization system that supports individual users, organizations, projects, and role-based access control.

## Outcome

Users can sign up, verify their email, log in, create organizations and projects, invite team members, generate API keys, and operate within isolated tenant boundaries with appropriate permissions.

## Scope

- Email/password registration with email verification, login, password reset (API-owned auth, master plan D-01)
- OAuth providers (Google, GitHub) handled by the API with safe account linking
- Access JWT + rotating refresh tokens in `HttpOnly` same-site cookies, with reuse detection
- Minimal transactional `Mailer` (verification, reset, invitations)
- Organization and project CRUD, onboarding to the first project
- Organization membership and invitation flow
- Role-based access control (Owner, Admin, Member, Viewer — master plan §7)
- Plan limits for projects and members (master plan §8)
- API key generation and management
- Tenant isolation at the database query level (tenant-scoped client, nested routes, 404 policy)
- Rate limiting, security headers, audit events

## Architecture

```text
Auth Flow (API-owned):
  Browser (app.<domain>) -> POST api.<domain>/api/v1/auth/login | OAuth callback
         |                     -> argon2id verify / provider token exchange
         v
  Set-Cookie: access (15 min), refresh (30 days, rotating)  [HttpOnly; Secure; SameSite=Lax]
         |
         v
  API Request (cookie) -> authenticateUser -> resolveTenantContext (project -> org -> membership -> role)
         |                                       -> requireRole(min) -> handler
         v
  createTenantDb(ctx) -> every query scoped by orgId / projectId

CI Flow:
  Reporter -> Authorization: Bearer tp_live_... -> authenticateApiKey -> { orgId, projectId } -> /api/v1/ingest/* only
```

## Business Rules

- A user may exist without an organization (e.g. right after sign-up); onboarding leads them to create one, unless they joined via invitation.
- The user who creates an organization is automatically the Owner. There is exactly one Owner per org.
- Owners can transfer ownership but cannot be removed. Nobody can grant or revoke Owner except through transfer.
- Roles are organization-level and apply to all projects in the org.
- API keys are scoped to a project, not an organization.
- API keys can only call ingestion endpoints (`/api/v1/ingest/*`) for their project — including reading that project's quarantine list — and nothing else.
- Email verification is required before accepting invitations or linking OAuth accounts by email.
- Deleted users' data is preserved but anonymized.

## Testing

- Unit tests for the RBAC permission map and token rotation logic
- Integration tests for auth flows (register, verify, login, refresh + reuse detection, logout, reset)
- Integration tests for OAuth with mocked providers, including refused unsafe linking
- Integration tests for the invitation flow
- E2E tests for the sign-up → verify → create org & project → invite journey
- Table-driven isolation suite: cross-tenant → 404, under-privileged → 403, for every route

## Acceptance Criteria

- [ ] Users can register via email (with verification) and OAuth (Google, GitHub).
- [ ] Access and refresh tokens are issued as secure cookies and rotated correctly; refresh reuse revokes the family.
- [ ] Organizations and projects can be created and updated within plan limits, and members invited.
- [ ] RBAC is enforced on all API endpoints from a single permission map.
- [ ] API keys can be generated and used for ingestion only.
- [ ] Tenant isolation is verified with cross-tenant access tests for every route.
- [ ] Password reset flow works end-to-end.

## Exit Criteria

A user can sign up, create an org and project, invite a teammate, and both can access only their own organization's data.

## Sprint Decomposition

- P03-S01: User registration, email verification and password authentication
- P03-S02: OAuth integration (Google + GitHub)
- P03-S03: Organization & project CRUD and membership model
- P03-S04: Invitation flow and role-based access control
- P03-S05: API key generation and management
- P03-S06: Tenant isolation verification and security hardening
