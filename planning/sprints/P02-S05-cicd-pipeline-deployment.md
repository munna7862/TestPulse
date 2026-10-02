# Phase 02 — Sprint 05: CI/CD Pipeline and Deployment Targets

## Sprint Objective

Set up the GitHub Actions CI pipeline and the **free-tier** staging deployment (master plan §4.4, D-14): Vercel Hobby for the frontend, Render free for the API (with in-process workers), Neon free, and Render Key Value.

## Dependencies

P02-S04 developer tooling.

## Personas

- **Lead:** `role-devops-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-security-engineer`

## Scope

### Granular Implementation Tasks

1. Create `.github/workflows/ci.yml` per the DevOps skill: runs on PRs and pushes to main, with a concurrency group and PostgreSQL + Redis service containers.
2. CI `verify` job: npm ci, lint, typecheck, test (with coverage thresholds), test:contract, build, `npm audit --audit-level=high`, and secret scanning (gitleaks).
3. CI `e2e` job: start api, worker, and web against the service containers, run the Playwright smoke suite, and upload traces on failure.
4. Configure initial Vitest coverage thresholds (ratchet towards master plan §10).
5. Configure the Vercel (Hobby) project for apps/web with preview deployments per PR and the `/api` rewrite to the Render API.
6. Configure one Render free web service for apps/api (`RUN_WORKERS_IN_PROCESS=true`, `/health` check), using a `render.yaml` blueprint. Run `prisma migrate deploy` as a CI deploy step (free services have no pre-deploy hook guarantees).
7. Provision a Neon free project (staging branch) and Render Key Value (free). Record the current free-tier limits and known constraints in `docs/ops/free-tier-deployment.md`.
8. Optional: a scheduled GitHub Actions workflow that pings `/health` during working hours to reduce cold starts (check the provider terms first).
9. Integrate Sentry (free plan) in web, api, and worker with release tagging.
10. Configure branch protection on main (require `verify` and `e2e`).
11. Create `.env.example` files and `docs/ops/environment.md`, and add status badges to README.
12. Add `scripts/check-traceability.mjs` to CI. It fails if a scenario marked automated in `docs/testing/scenario-catalog.md` has no test whose title contains its `SC-*` ID.

## Expected Files / Areas

`.github/workflows/ci.yml`, `.github/workflows/deploy-staging.yml`, `render.yaml`, `apps/web/next.config.ts` (rewrites), `docs/ops/environment.md`, `docs/ops/free-tier-deployment.md`, `scripts/check-traceability.mjs`, `README.md`

## Testing & Verification

Open a PR and verify both CI jobs run and pass; verify the preview deployment triggers; trigger a test error and confirm Sentry receives it.

## Acceptance Criteria

- [ ] CI runs on every PR and push to main, with all gates passing.
- [ ] Coverage thresholds are enforced in CI.
- [ ] On merge to main, Vercel deploys the frontend and Render deploys the API (with in-process workers), all on free plans.
- [ ] Login works through the `/api` proxy with first-party cookies.
- [ ] The traceability check runs in CI.
- [ ] Preview deployments work for pull requests.
- [ ] Sentry receives errors from web, api, and worker.
- [ ] README has CI and deployment status badges.

## Risks / Guardrails

Secrets not configured in GitHub; migrations run from multiple instances at once (run them once, from CI); flaky E2E smoke tests in CI; missing environment variables; free-tier limits changing without notice; cold starts making deploy smoke checks flaky (retry with a generous timeout).

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02 — Sprint 05: CI/CD Pipeline and Deployment Targets.
Act as: role-devops-engineer (load .agents/skills/role-devops-engineer/SKILL.md). Reviewers: role-sdet-architect, role-security-engineer.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/02-phase-project-bootstrap-devops.md
4. planning/sprints/P02-S05-cicd-pipeline-deployment.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P02_S05.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P02-S05.md and update task.md.
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
