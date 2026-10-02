# Phase 10 — Sprint 05: Production Deployment Validation (Staging)

## Sprint Objective

Validate the complete product on the **free-tier staging profile** (master plan §4.4) and document how it behaves. This is the last sprint before the paid migration decision.

## Dependencies

P10-S04 security audit.

## Personas

- **Lead:** `role-devops-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-security-engineer`

## Scope

### Granular Implementation Tasks

1. Confirm the frontend deploys to Vercel (Hobby) with the `/api` rewrite.
2. Confirm the API deploys to Render free with in-process workers.
3. Confirm the staging database (Neon free) and Redis (Render Key Value free) are configured, and data volume is within limits.
4. Run `prisma migrate deploy` against staging, and verify migrations are backward-compatible with the previous release.
5. Run the full E2E suite against staging.
6. Verify WebSocket connections (ticket auth, websocket transport) through Render's proxy, including after a cold start.
7. Verify catch-up behavior: let the service sleep, then confirm SLA markers, the run reaper, and retention catch up correctly on wake.
8. Test OAuth callbacks with staging URLs.
9. Verify email delivery in staging (free tier: to verified/owner addresses).
10. Run the example reporter projects against the staging API, including from a cold start.
11. Verify Sentry, logging, and the worker heartbeat in staging.
12. Document the deployment runbook, and list the observed free-tier limitations as input to the P10-S06 decision.

## Expected Files / Areas

`.github/workflows/deploy-staging.yml`, `docs/ops/deployment-runbook.md`

## Testing & Verification

Run full test suite against staging. Manual smoke test of all features. Verify monitoring.

## Acceptance Criteria

- [ ] Frontend is deployed and accessible on staging.
- [ ] API is deployed and responding on staging.
- [ ] WebSocket connections work through the Render proxy, including after cold starts.
- [ ] OAuth works with staging callback URLs.
- [ ] Full E2E suite passes against staging.
- [ ] Sentry captures errors in staging.
- [ ] Deployment runbook is documented.

## Risks / Guardrails

Environment variable misconfiguration; WebSocket blocked by the cloud proxy; OAuth callback URL mismatch; mistaking free-tier slowness for application bugs (compare with local measurements).

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
3. Author docs/testing/test_cases_catalog_P10_S05.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P10-S05.md and update task.md.
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
