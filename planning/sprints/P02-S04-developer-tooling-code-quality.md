# Phase 02 — Sprint 04: Developer Tooling and Code Quality

## Sprint Objective

Configure ESLint, Prettier, TypeScript strict mode, and pre-commit hooks across the monorepo.

## Dependencies

P02-S03 database setup.

## Scope

### Granular Implementation Tasks

1. Configure ESLint with TypeScript rules across all workspaces.
2. Configure Prettier with consistent formatting rules.
3. Enable TypeScript strict mode in all tsconfig files.
4. Set up Husky pre-commit hooks (lint-staged).
5. Configure commitlint for conventional commit enforcement.
6. Add VS Code workspace settings (.vscode/settings.json, extensions.json).
7. Create npm scripts: lint, lint:fix, format, format:check, typecheck.

## Expected Files / Areas

`.eslintrc`, `.prettierrc`, `.husky/`, `.vscode/`

## Testing & Verification

Run lint, format:check, and typecheck across the entire monorepo. All must exit cleanly.

## Acceptance Criteria

- [ ] ESLint runs without errors across all workspaces.
- [ ] Prettier formatting is consistent.
- [ ] TypeScript strict mode is enabled with zero errors.
- [ ] Pre-commit hooks prevent unlinted code from being committed.
- [ ] Conventional commits are enforced.

## Risks / Guardrails

Overly strict lint rules that slow development; conflicting ESLint and Prettier rules.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02, Sprint 04: Developer Tooling and Code Quality.

OBJECTIVE:
Configure ESLint, Prettier, TypeScript strict mode, and pre-commit hooks across the monorepo.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Configure ESLint with TypeScript rules across all workspaces.
2. Configure Prettier with consistent formatting rules.
3. Enable TypeScript strict mode in all tsconfig files.
4. Set up Husky pre-commit hooks (lint-staged).
5. Configure commitlint for conventional commit enforcement.
6. Add VS Code workspace settings (.vscode/settings.json, extensions.json).
7. Create npm scripts: lint, lint:fix, format, format:check, typecheck.

TEST:
Run lint, format:check, and typecheck across the entire monorepo. All must exit cleanly.

ACCEPTANCE:
- [ ] ESLint runs without errors across all workspaces.
- [ ] Prettier formatting is consistent.
- [ ] TypeScript strict mode is enabled with zero errors.
- [ ] Pre-commit hooks prevent unlinted code from being committed.
- [ ] Conventional commits are enforced.

GUARDRAILS:
Overly strict lint rules that slow development; conflicting ESLint and Prettier rules.

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
