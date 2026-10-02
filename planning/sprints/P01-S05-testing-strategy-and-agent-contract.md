# Phase 01 — Sprint 05: Testing Strategy and Agent Operating Contract

## Sprint Objective

Define the testing strategy (coverage targets, test types, CI gates) and create the AGENTS.md operating contract for the repository.

## Dependencies

P01-S03 system architecture, P01-S04 security model.

## Scope

### Granular Implementation Tasks

1. Define testing pyramid (unit, integration, E2E proportions and coverage targets).
2. Define CI quality gates (lint, typecheck, test, build, security scan).
3. Define test data management strategy (factories, fixtures, seeding).
4. Define E2E test scope (critical user journeys to automate).
5. Create AGENTS.md with repository rules, architecture mandates, and development protocols.
6. Define conventional commit format and PR conventions.
7. Define branch strategy (main, feature branches, release branches).

## Expected Files / Areas

`docs/testing-strategy.md`, `AGENTS.md`

## Testing & Verification

Review testing strategy for gaps, unrealistic coverage targets, and missing CI gates.

## Acceptance Criteria

- [ ] Testing pyramid is defined with coverage targets.
- [ ] CI quality gates are documented.
- [ ] Test data strategy is practical and maintainable.
- [ ] AGENTS.md is comprehensive and committed.
- [ ] Branch strategy and commit conventions are defined.

## Risks / Guardrails

Setting unrealistic 100% coverage targets; missing critical E2E scenarios; overly rigid agent rules.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 01, Sprint 05: Testing Strategy and Agent Operating Contract.

OBJECTIVE:
Define the testing strategy (coverage targets, test types, CI gates) and create the AGENTS.md operating contract for the repository.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Define testing pyramid (unit, integration, E2E proportions and coverage targets).
2. Define CI quality gates (lint, typecheck, test, build, security scan).
3. Define test data management strategy (factories, fixtures, seeding).
4. Define E2E test scope (critical user journeys to automate).
5. Create AGENTS.md with repository rules, architecture mandates, and development protocols.
6. Define conventional commit format and PR conventions.
7. Define branch strategy (main, feature branches, release branches).

TEST:
Review testing strategy for gaps, unrealistic coverage targets, and missing CI gates.

ACCEPTANCE:
- [ ] Testing pyramid is defined with coverage targets.
- [ ] CI quality gates are documented.
- [ ] Test data strategy is practical and maintainable.
- [ ] AGENTS.md is comprehensive and committed.
- [ ] Branch strategy and commit conventions are defined.

GUARDRAILS:
Setting unrealistic 100% coverage targets; missing critical E2E scenarios; overly rigid agent rules.

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
