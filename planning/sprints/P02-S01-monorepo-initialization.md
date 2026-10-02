# Phase 02 — Sprint 01: Monorepo Initialization and Turborepo Setup

## Sprint Objective

Initialize the monorepo with Turborepo, define workspace structure, and configure root-level package management.

## Dependencies

Phase 01 complete.

## Scope

### Granular Implementation Tasks

1. Initialize npm/pnpm workspace with Turborepo.
2. Create workspace directories: apps/web, apps/api, packages/db, packages/shared, packages/ui, packages/reporter.
3. Configure turbo.json with pipeline definitions (build, dev, lint, test, typecheck).
4. Set up root package.json with workspace scripts.
5. Configure pnpm-workspace.yaml or npm workspaces.
6. Add .gitignore, .editorconfig, and .nvmrc (Node 20 LTS).
7. Initialize git repository with conventional commit hooks (Husky + commitlint).

## Expected Files / Areas

Root `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `.gitignore`

## Testing & Verification

Verify `npm install` succeeds, `turbo run build` exits cleanly, and workspace references resolve.

## Acceptance Criteria

- [ ] Turborepo is configured with correct pipeline dependencies.
- [ ] All workspace directories exist with valid package.json files.
- [ ] Root scripts delegate correctly to workspace packages.
- [ ] Git hooks enforce conventional commits.

## Risks / Guardrails

Choosing wrong package manager; misconfigured workspace references; over-complicated turbo pipeline.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02, Sprint 01: Monorepo Initialization and Turborepo Setup.

OBJECTIVE:
Initialize the monorepo with Turborepo, define workspace structure, and configure root-level package management.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Initialize npm/pnpm workspace with Turborepo.
2. Create workspace directories: apps/web, apps/api, packages/db, packages/shared, packages/ui, packages/reporter.
3. Configure turbo.json with pipeline definitions (build, dev, lint, test, typecheck).
4. Set up root package.json with workspace scripts.
5. Configure pnpm-workspace.yaml or npm workspaces.
6. Add .gitignore, .editorconfig, and .nvmrc (Node 20 LTS).
7. Initialize git repository with conventional commit hooks (Husky + commitlint).

TEST:
Verify `npm install` succeeds, `turbo run build` exits cleanly, and workspace references resolve.

ACCEPTANCE:
- [ ] Turborepo is configured with correct pipeline dependencies.
- [ ] All workspace directories exist with valid package.json files.
- [ ] Root scripts delegate correctly to workspace packages.
- [ ] Git hooks enforce conventional commits.

GUARDRAILS:
Choosing wrong package manager; misconfigured workspace references; over-complicated turbo pipeline.

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
