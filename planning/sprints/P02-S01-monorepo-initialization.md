# Phase 02 — Sprint 01: Monorepo Initialization and Turborepo Setup

## Sprint Objective

Initialize the monorepo with Turborepo, define workspace structure, and configure root-level package management.

## Dependencies

Phase 01 complete.

## Personas

- **Lead:** `role-devops-engineer`
- **Reviewers / sign-off:** `role-fullstack-architect`

## Scope

### Granular Implementation Tasks

1. Initialize npm workspaces with Turborepo 2 (ADR-001). Do not mix in pnpm configuration.
2. Create the workspace directories apps/web, apps/api, packages/db, packages/shared, packages/ui, and packages/reporter, each with a `@testpulse/*` package.json.
3. Configure turbo.json `tasks` (build, dev, lint, typecheck, test, test:contract, test:e2e) with correct `dependsOn`, `outputs`, and `env` declarations.
4. Set up root package.json scripts that delegate to Turborepo and contain no shell-specific syntax.
5. Add .gitignore, .editorconfig, `.gitattributes` (`* text=auto eol=lf`), `.nvmrc` (Node 24 LTS), and an `engines` field.
6. Add Husky + commitlint for conventional commits, and verify the hooks run on Windows PowerShell.
7. Renormalize the existing repository files (`git add --renormalize .`) so planning docs are LF and BOM-free.

## Expected Files / Areas

Root `package.json`, `package-lock.json`, `turbo.json`, `.gitattributes`, `.editorconfig`, `.nvmrc`, `.husky/`, `commitlint.config.mjs`

## Testing & Verification

On Windows PowerShell and in Linux CI: `npm install` succeeds, `npx turbo run build` exits cleanly, and workspace references resolve.

## Acceptance Criteria

- [ ] Turborepo is configured with correct task dependencies and cache outputs.
- [ ] All workspace directories exist with valid package.json files.
- [ ] Root scripts delegate correctly and run on both PowerShell and bash.
- [ ] Node 24 LTS is pinned and enforced.
- [ ] Git hooks enforce conventional commits, and line endings are normalized.

## Risks / Guardrails

Misconfigured workspace references; over-complicated turbo pipeline; cache keys missing env vars (stale builds); hooks that fail on Windows.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02 — Sprint 01: Monorepo Initialization and Turborepo Setup.
Act as: role-devops-engineer (load .agents/skills/role-devops-engineer/SKILL.md). Reviewers: role-fullstack-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/02-phase-project-bootstrap-devops.md
4. planning/sprints/P02-S01-monorepo-initialization.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P02_S01.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P02-S01.md and update task.md.
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
