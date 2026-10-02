# Phase 10 — Sprint 05: Production Deployment Validation (Staging)

## Sprint Objective

Deploy to staging environment and validate all features work in a production-like setup.

## Dependencies

P10-S04 security audit.

## Scope

### Granular Implementation Tasks

1. Deploy frontend to Vercel staging environment.
2. Deploy API to Railway staging environment.
3. Configure staging database (Neon) and Redis (Upstash).
4. Run full E2E test suite against staging.
5. Verify WebSocket connections work through Vercel/Railway proxies.
6. Test OAuth callbacks with staging URLs.
7. Verify email delivery in staging.
8. Test CI reporter against staging API.
9. Verify monitoring and error tracking (Sentry) in staging.
10. Document deployment runbook.

## Expected Files / Areas

`.github/workflows/deploy-staging.yml`, `docs/deployment-runbook.md`

## Testing & Verification

Run full test suite against staging. Manual smoke test of all features. Verify monitoring.

## Acceptance Criteria

- [ ] Frontend is deployed and accessible on staging.
- [ ] API is deployed and responding on staging.
- [ ] WebSocket connections work through cloud proxies.
- [ ] OAuth works with staging callback URLs.
- [ ] Full E2E suite passes against staging.
- [ ] Sentry captures errors in staging.
- [ ] Deployment runbook is documented.

## Risks / Guardrails

Environment variable misconfiguration; WebSocket blocked by cloud proxy; OAuth callback URL mismatch.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10, Sprint 05: Production Deployment Validation (Staging).

OBJECTIVE:
Deploy to staging environment and validate all features work in a production-like setup.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Deploy frontend to Vercel staging environment.
2. Deploy API to Railway staging environment.
3. Configure staging database (Neon) and Redis (Upstash).
4. Run full E2E test suite against staging.
5. Verify WebSocket connections work through Vercel/Railway proxies.
6. Test OAuth callbacks with staging URLs.
7. Verify email delivery in staging.
8. Test CI reporter against staging API.
9. Verify monitoring and error tracking (Sentry) in staging.
10. Document deployment runbook.

TEST:
Run full test suite against staging. Manual smoke test of all features. Verify monitoring.

ACCEPTANCE:
- [ ] Frontend is deployed and accessible on staging.
- [ ] API is deployed and responding on staging.
- [ ] WebSocket connections work through cloud proxies.
- [ ] OAuth works with staging callback URLs.
- [ ] Full E2E suite passes against staging.
- [ ] Sentry captures errors in staging.
- [ ] Deployment runbook is documented.

GUARDRAILS:
Environment variable misconfiguration; WebSocket blocked by cloud proxy; OAuth callback URL mismatch.

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
