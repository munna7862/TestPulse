# Phase 10 — Sprint 04: Security Audit and Dependency Review

## Sprint Objective

Conduct a comprehensive security audit: OWASP checklist, dependency vulnerabilities, and penetration testing for critical flows.

## Dependencies

P10-S03 performance testing.

## Personas

- **Lead:** `role-security-engineer`
- **Reviewers / sign-off:** `role-backend-engineer`, `role-devops-engineer`

## Scope

### Granular Implementation Tasks

1. Run `npm audit --audit-level=high` and gitleaks, and fix all findings.
2. Audit OWASP Top 10 compliance across all endpoints.
3. Verify tenant isolation with the cross-tenant suite plus manual probing (REST, socket rooms, exports, webhooks).
4. Test rate-limiting effectiveness under attack simulation (credential stuffing, key rotation).
5. Review the auth implementation: token lifetimes, rotation and reuse detection, cookie flags, CSRF, account enumeration, and OAuth linking.
6. Review API key storage, scope, and revocation.
7. Test CORS and CSP enforcement.
8. Test XSS with malicious test titles, stack traces (ANSI), and comments.
9. Test SSRF protections on webhooks (private IPs, DNS rebinding, redirects).
10. Test CSV formula injection in exports.
11. Verify SQL injection prevention, including every raw SQL query.
12. Document security review findings and remediations.

## Expected Files / Areas

`docs/security/audit-v1.md`, `apps/api/test/security/`

## Testing & Verification

Run security scan tools. Execute manual penetration tests for critical flows. Verify all findings are remediated.

## Acceptance Criteria

- [ ] `npm audit` shows no critical or high vulnerabilities, and no secrets are found.
- [ ] OWASP Top 10 compliance is verified.
- [ ] Cross-tenant access is impossible via REST, sockets, exports, or webhooks.
- [ ] Rate limiting blocks abuse.
- [ ] The auth lifecycle (tokens, cookies, OAuth linking) is secure.
- [ ] XSS, SSRF, CSV injection, and SQL injection are prevented.
- [ ] The security audit is documented with sign-off.

## Risks / Guardrails

False sense of security from passing automated scans; missing business logic vulnerabilities; dependency with known CVE.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10 — Sprint 04: Security Audit and Dependency Review.
Act as: role-security-engineer (load .agents/skills/role-security-engineer/SKILL.md). Reviewers: role-backend-engineer, role-devops-engineer.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/10-phase-quality-engineering-release.md
4. planning/sprints/P10-S04-security-audit-dependency-review.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P10_S04.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P10-S04.md and update task.md.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] Acceptance criteria verified.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
