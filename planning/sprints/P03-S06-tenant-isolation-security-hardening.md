# Phase 03 — Sprint 06: Tenant Isolation Verification and Security Hardening

## Sprint Objective

Verify and harden tenant isolation across all data access paths. Ensure no cross-tenant data leakage.

## Dependencies

P03-S05 API key management.

## Scope

### Granular Implementation Tasks

1. Audit all database queries for tenant filtering (orgId/projectId WHERE clause).
2. Create cross-tenant access test suite (User A cannot see User B data).
3. Implement request rate limiting (express-rate-limit or fastify-rate-limit).
4. Configure CORS policy (allowed origins).
5. Add security headers (Helmet or equivalent).
6. Implement request logging with tenant context (structured JSON logs).
7. Review and document all authentication and authorization flows.
8. Run npm audit and fix any high/critical vulnerabilities.

## Expected Files / Areas

`apps/api/src/middleware/`, `tests/security/`

## Testing & Verification

Cross-tenant isolation tests. Rate limiting tests. Security header verification. Dependency audit.

## Acceptance Criteria

- [ ] No cross-tenant data leakage in any API endpoint.
- [ ] Rate limiting is active on all public endpoints.
- [ ] Security headers are present (CORS, CSP, etc.).
- [ ] Request logging includes tenant context.
- [ ] npm audit shows no critical vulnerabilities.
- [ ] All auth flows are documented.

## Risks / Guardrails

Missed tenant filter in a single query; overly permissive CORS; rate limit bypass via API key.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03, Sprint 06: Tenant Isolation Verification and Security Hardening.

OBJECTIVE:
Verify and harden tenant isolation across all data access paths. Ensure no cross-tenant data leakage.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Audit all database queries for tenant filtering (orgId/projectId WHERE clause).
2. Create cross-tenant access test suite (User A cannot see User B data).
3. Implement request rate limiting (express-rate-limit or fastify-rate-limit).
4. Configure CORS policy (allowed origins).
5. Add security headers (Helmet or equivalent).
6. Implement request logging with tenant context (structured JSON logs).
7. Review and document all authentication and authorization flows.
8. Run npm audit and fix any high/critical vulnerabilities.

TEST:
Cross-tenant isolation tests. Rate limiting tests. Security header verification. Dependency audit.

ACCEPTANCE:
- [ ] No cross-tenant data leakage in any API endpoint.
- [ ] Rate limiting is active on all public endpoints.
- [ ] Security headers are present (CORS, CSP, etc.).
- [ ] Request logging includes tenant context.
- [ ] npm audit shows no critical vulnerabilities.
- [ ] All auth flows are documented.

GUARDRAILS:
Missed tenant filter in a single query; overly permissive CORS; rate limit bypass via API key.

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
