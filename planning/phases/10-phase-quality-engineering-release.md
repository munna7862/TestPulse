# Phase 10 — Quality Engineering & Release

← [Phase 09](./09-phase-ux-polish-accessibility.md) | [Phase 11 →](./11-phase-landing-page-docs-gtm.md)

## Objective

Harden the application for production. Achieve comprehensive test coverage, fix remaining bugs, conduct security audits, and validate production readiness.

## Outcome

TestPulse v1.0 runs in production for invited design partners (private beta), with a clean CI pipeline, comprehensive test coverage, no known critical bugs, a published reporter, and a tested rollback plan. The public launch follows in P11-S05 (master plan D-11).

## Scope

- Test coverage audit and gap analysis
- Integration test hardening (auth, ingestion, WebSocket)
- E2E regression suite (all critical user journeys)
- Performance testing (API throughput, WebSocket concurrency, dashboard render)
- Security audit (OWASP, dependency vulnerabilities, tenant isolation)
- Load testing (k6 for API, ingestion, and WebSocket)
- Database query optimization (slow query analysis)
- Error monitoring verification (Sentry was set up in P02-S05)
- Staging validation on the free-tier profile (cold starts, in-process workers, migrations)
- **Paid production migration (decision gate, D-14):** choose providers, build the production environment, and re-verify the §10 targets on paid infrastructure
- Reporter 1.0.0 publish, production deploy (private beta), release checklist and sign-off

## Quality Gates

```text
Gate 1: All tests pass (unit + integration + contract + E2E), coverage thresholds met
Gate 2: TypeScript strict mode with zero errors
Gate 3: ESLint with zero warnings
Gate 4: No critical/high dependency vulnerabilities, no leaked secrets
Gate 5: WCAG 2.1 AA accessibility compliance
Gate 6: All master plan §10 performance targets met (API p95, WS latency at
        1,000 connections/instance, ingestion throughput, dashboard LCP)
Gate 7: Tenant isolation suite covers every route and passes
Gate 8: Staging deployment validated, rollback tested
```

## Testing

- Regression test suite covering all user journeys
- Load test: 1,000 concurrent API requests
- Load test: 1,000 concurrent WebSocket connections per gateway instance
- Security scan with npm audit + gitleaks (Snyk optional)
- Lighthouse performance and accessibility audit
- Cross-browser testing (Chrome, Firefox, Safari, Edge)

## Acceptance Criteria

- [ ] Coverage meets the master plan §10 targets.
- [ ] All critical user journeys have E2E tests.
- [ ] No critical or high severity bugs open.
- [ ] Performance SLAs are met under load.
- [ ] Security audit passes with no critical findings.
- [ ] Production deployment is validated on staging, and v1.0 is live for design partners.
- [ ] Release checklist is fully complete.

## Exit Criteria

TestPulse v1.0 is in real users' hands (private beta) and can be confidently opened to the public.

## Sprint Decomposition

- P10-S01: Test coverage audit and gap analysis
- P10-S02: Integration and E2E test hardening
- P10-S03: Performance and load testing
- P10-S04: Security audit and dependency review
- P10-S05: Staging deployment validation (free-tier profile)
- P10-S06: Paid production infrastructure decision and migration
- P10-S07: v1.0 release candidate and private beta launch
