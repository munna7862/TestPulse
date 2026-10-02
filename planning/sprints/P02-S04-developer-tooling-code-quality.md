# Phase 02 — Sprint 04: Developer Tooling and Code Quality

## Sprint Objective

Configure ESLint, Prettier, TypeScript strict mode, and pre-commit hooks across the monorepo.

## Dependencies

P02-S03 database setup.

## Personas

- **Lead:** `role-devops-engineer`
- **Reviewers / sign-off:** `role-fullstack-architect`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Configure ESLint 9 flat config (`eslint.config.mjs`) with typescript-eslint type-checked rules (`no-explicit-any`, `no-floating-promises`, `no-unsafe-*`).
2. Add boundary rules (`no-restricted-imports` / `eslint-plugin-boundaries`): web ↛ db, shared stays browser-safe, `@prisma/client` only in packages/db, no relative imports across packages.
3. Configure Prettier with `eslint-config-prettier` to avoid rule conflicts.
4. Confirm TypeScript strict mode in every workspace via the shared base config.
5. Set up Husky pre-commit hooks with lint-staged.
6. Configure commitlint for conventional commit enforcement.
7. Add VS Code workspace settings and recommended extensions.
8. Create npm scripts: lint, lint:fix, format, format:check, typecheck.

## Expected Files / Areas

`eslint.config.mjs`, `.prettierrc`, `.husky/`, `.vscode/`

## Testing & Verification

Run lint, format:check, and typecheck across the monorepo; all must exit cleanly. Add a deliberate boundary violation in a scratch branch and confirm lint fails.

## Acceptance Criteria

- [ ] ESLint runs without errors or warnings across all workspaces.
- [ ] Boundary violations (e.g. web importing db) fail lint.
- [ ] Prettier formatting is consistent and does not conflict with ESLint.
- [ ] TypeScript strict mode is enabled with zero errors.
- [ ] Pre-commit hooks prevent unlinted code from being committed, and conventional commits are enforced.

## Risks / Guardrails

Overly strict lint rules that slow development; slow type-aware linting in pre-commit (lint only staged files); conflicting ESLint and Prettier rules.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02 — Sprint 04: Developer Tooling and Code Quality.
Act as: role-devops-engineer (load .agents/skills/role-devops-engineer/SKILL.md). Reviewers: role-fullstack-architect, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/02-phase-project-bootstrap-devops.md
4. planning/sprints/P02-S04-developer-tooling-code-quality.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P02_S04.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P02-S04.md and update task.md.
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
