# Phase 03 — Sprint 06: Tenant Isolation Verification and Security Hardening

## Sprint Objective

Verify and harden tenant isolation across all data access paths. Ensure no cross-tenant data leakage.

## Dependencies

P03-S05 API key management.

## Personas

- **Lead:** `role-security-engineer`
- **Reviewers / sign-off:** `role-backend-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Audit every database access: it must use the tenant-scoped client, and every `systemDb` use is documented and justified.
2. Build a table-driven cross-tenant isolation suite. Every route is registered with its expected behavior (cross-tenant → 404, under-privileged → 403), and a meta-test fails if a route is missing from the table.
3. Configure rate limiting with `@fastify/rate-limit` and a Redis store, per the categories defined in P01-S04.
4. Configure the CORS allow-list (`WEB_ORIGIN`, credentials enabled).
5. Add `@fastify/helmet` on the API, plus Next.js security headers and a nonce-based CSP on the web app.
6. Add structured request logging with `requestId`, `orgId`, and `projectId`, and redact secrets.
7. Add the `AuditEvent` model and record invitations, role changes, removals, API key create/revoke, project create/delete, and ownership transfer.
8. Document all authentication and authorization flows in `docs/security/`.
9. Run `npm audit --audit-level=high` and gitleaks, and fix any findings.

## Expected Files / Areas

`apps/api/src/plugins/`, `apps/api/test/security/`, `apps/web/next.config.ts` / `middleware.ts`, `docs/security/`

## Testing & Verification

Run the isolation suite, rate-limiting tests, security header assertions (API and web), the dependency audit, and the secret scan.

## Acceptance Criteria

- [ ] No cross-tenant data leakage in any endpoint; every route is covered by the isolation table.
- [ ] Rate limiting is active on all public endpoints and holds across instances.
- [ ] Security headers are present on the API and the web app (CSP, HSTS, frame-ancestors).
- [ ] Request logs include tenant context and contain no secrets.
- [ ] Security-relevant actions are recorded as audit events.
- [ ] `npm audit` shows no critical or high vulnerabilities.

## Risks / Guardrails

A missed tenant filter in a single query; overly permissive CORS; rate-limit bypass via rotating API keys (also limit per project); CSP breaking Next.js inline scripts (use nonces).

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03 — Sprint 06: Tenant Isolation Verification and Security Hardening.
Act as: role-security-engineer (load .agents/skills/role-security-engineer/SKILL.md). Reviewers: role-backend-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/03-phase-authentication-multi-tenancy.md
4. planning/sprints/P03-S06-tenant-isolation-security-hardening.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P03_S06.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P03-S06.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] Acceptance criteria verified.
- [ ] Feature catalog status and scenario catalog "Automated by" entries updated; tests carry `[SC-*]` IDs in their titles.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
