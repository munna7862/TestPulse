# Phase 02 — Sprint 05: CI/CD Pipeline and Deployment Targets

## Sprint Objective

Set up GitHub Actions CI pipeline and configure deployment targets (Vercel for frontend, Railway for backend).

## Dependencies

P02-S04 developer tooling.

## Scope

### Granular Implementation Tasks

1. Create GitHub Actions CI workflow (.github/workflows/ci.yml).
2. CI pipeline: install, lint, typecheck, test, build.
3. Configure Vercel project for Next.js frontend deployment.
4. Configure Railway project for Fastify API deployment.
5. Set up preview deployments for pull requests.
6. Configure GitHub branch protection rules (require CI pass).
7. Add deployment status badges to README.
8. Create .env.example with all required environment variables.

## Expected Files / Areas

`.github/workflows/ci.yml`, `vercel.json`, `README.md`

## Testing & Verification

Push to a branch, verify CI pipeline runs and passes, verify preview deployment triggers.

## Acceptance Criteria

- [ ] CI pipeline runs on every push and PR.
- [ ] All CI stages pass (lint, typecheck, test, build).
- [ ] Vercel deploys the frontend on merge to main.
- [ ] Railway deploys the API on merge to main.
- [ ] Preview deployments work for pull requests.
- [ ] README has deployment status badges.

## Risks / Guardrails

Secrets not configured in GitHub; deployment target misconfiguration; missing environment variables.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02, Sprint 05: CI/CD Pipeline and Deployment Targets.

OBJECTIVE:
Set up GitHub Actions CI pipeline and configure deployment targets (Vercel for frontend, Railway for backend).

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create GitHub Actions CI workflow (.github/workflows/ci.yml).
2. CI pipeline: install, lint, typecheck, test, build.
3. Configure Vercel project for Next.js frontend deployment.
4. Configure Railway project for Fastify API deployment.
5. Set up preview deployments for pull requests.
6. Configure GitHub branch protection rules (require CI pass).
7. Add deployment status badges to README.
8. Create .env.example with all required environment variables.

TEST:
Push to a branch, verify CI pipeline runs and passes, verify preview deployment triggers.

ACCEPTANCE:
- [ ] CI pipeline runs on every push and PR.
- [ ] All CI stages pass (lint, typecheck, test, build).
- [ ] Vercel deploys the frontend on merge to main.
- [ ] Railway deploys the API on merge to main.
- [ ] Preview deployments work for pull requests.
- [ ] README has deployment status badges.

GUARDRAILS:
Secrets not configured in GitHub; deployment target misconfiguration; missing environment variables.

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
