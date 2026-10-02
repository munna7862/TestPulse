# Phase 01 — Sprint 04: Security and Permissions Model

## Sprint Objective

Design the security architecture: authentication flows, RBAC model, API key scoping, tenant isolation strategy, and threat model.

## Dependencies

P01-S03 system architecture.

## Personas

- **Lead:** `role-security-engineer`
- **Reviewers / sign-off:** `role-fullstack-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Design authentication flows per D-01: register, email verification, login, refresh-token rotation with reuse detection, logout, password reset, and OAuth sign-in and account-linking rules (write ADR-005).
2. Finalize the RBAC matrix (master plan §7) and map every planned endpoint and socket event to a minimum role.
3. Specify the API key model: format, hashing, prefix display, ingest-only scope (including the quarantine list), revocation, expiry, and rotation guidance.
4. Define tenant isolation enforcement points (tenant-scoped client, nested routes, socket rooms, jobs) and the 404/403 policy. Decide on PostgreSQL RLS (closes Q4) in ADR-006.
5. Define rate limiting per endpoint category (auth per IP and per account, ingestion per key and per project, general API per user).
6. Create a STRIDE threat model for critical flows, including untrusted CI data (XSS, secrets in stack traces), webhook SSRF, account pre-hijacking via OAuth linking, and invitation token misuse.
7. Define secrets management: environment variables, the webhook-secret encryption key, rotation procedures, and no committed secrets (gitleaks).
8. Document CORS, CSRF (cookie-authenticated mutations), and CSP policies for web and API.
9. Define the data lifecycle: retention, user deletion/anonymization, and org deletion.

## Expected Files / Areas

`docs/security/security-model.md`, `docs/security/rbac-matrix.md`, `docs/security/threat-model.md`, `docs/architecture/adr-005-*.md`, `docs/architecture/adr-006-*.md`

## Testing & Verification

Review the security model for privilege escalation paths, tenant data leakage, account-takeover paths, and API key abuse scenarios.

## Acceptance Criteria

- [ ] The RBAC matrix is complete, unambiguous, and mapped to endpoints.
- [ ] Tenant isolation strategy is documented with enforcement points and the 404/403 policy.
- [ ] The API key scope prevents any read access beyond the project's quarantine list.
- [ ] Rate limiting strategy is defined per endpoint category.
- [ ] The threat model identifies the top risks with mitigations, and Q4 is closed.

## Risks / Guardrails

Security as an afterthought; overly permissive default roles; API keys with too much scope; OAuth account linking that enables takeover.

## Antigravity Execution Prompt

```text
You are the documentation/design agent for TestPulse, Phase 01 — Sprint 04: Security and Permissions Model.
Act as: role-security-engineer (load .agents/skills/role-security-engineer/SKILL.md). Reviewers: role-fullstack-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts (§4–§8), Decision Log (§11), Open Decisions (§12)
3. planning/phases/01-phase-product-architecture-foundation.md
4. planning/sprints/P01-S04-security-and-permissions-model.md — its Scope, Expected Files, Acceptance Criteria and Risks are the contract for this session.

BEFORE WRITING:
1. Confirm the sprint's dependencies are [x] in task.md; if not, stop and report.
2. Produce a short plan listing each deliverable and its path (paths must follow doc-implementation-standards).

EXECUTE every task under "Granular Implementation Tasks". Where a task resolves an item in master plan §12, record the decision as an ADR (or PRD section) and update master plan §11/§12 in the same change. Do not contradict the master plan silently — either align with it or propose an amendment explicitly.

AT COMPLETION:
- List the documents created/changed and how each acceptance criterion is satisfied.
- List any new open questions with the sprint that must close them.
- Update task.md.
```

## Sprint Definition of Done

- [ ] Every deliverable exists at the path listed in Expected Files / Areas.
- [ ] Content is consistent with the master plan; any change to a canonical contract is reflected in the master plan (§11 Decision Log / §12 Open Decisions).
- [ ] Open questions are listed with an owner sprint.
- [ ] Reviewer personas have reviewed the deliverables against the acceptance criteria.
- [ ] `task.md` updated.
