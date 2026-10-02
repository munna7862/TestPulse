# Phase 10 — Sprint 05: Production Deployment Validation (Staging)

## Sprint Objective

Deploy to staging environment and validate all features work in a production-like setup.

## Dependencies

P10-S04 security audit.

## Personas

- **Lead:** `role-devops-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-security-engineer`

## Scope

### Granular Implementation Tasks

1. Deploy the frontend to the Vercel staging environment.
2. Deploy the `api` and `worker` services to the Railway staging environment.
3. Configure the staging database (a Neon branch) and Redis (per ADR-003).
4. Run `prisma migrate deploy` against staging, and verify migrations are backward-compatible with the previous release.
5. Run the full E2E suite against staging.
6. Verify WebSocket connections work through the Railway proxy with multiple gateway instances (sticky sessions or websocket-only transport).
7. Test OAuth callbacks with staging URLs.
8. Verify email delivery and domain authentication (SPF/DKIM/DMARC) in staging.
9. Run the example reporter projects against the staging API.
10. Verify Sentry, logging, uptime probes, and the worker heartbeat in staging.
11. Document the deployment runbook.

## Expected Files / Areas

`.github/workflows/deploy-staging.yml`, `docs/ops/deployment-runbook.md`

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
You are the implementation agent for TestPulse, Phase 10 — Sprint 05: Production Deployment Validation (Staging).
Act as: role-devops-engineer (load .agents/skills/role-devops-engineer/SKILL.md). Reviewers: role-sdet-architect, role-security-engineer.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/10-phase-quality-engineering-release.md
4. planning/sprints/P10-S05-staging-deployment-validation.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P10_S05.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P10-S05.md and update task.md.
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
