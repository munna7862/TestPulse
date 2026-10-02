# Phase 01 — Sprint 05: Testing Strategy and Agent Operating Contract

## Sprint Objective

Define the testing strategy (coverage targets, test types, CI gates) and create the AGENTS.md operating contract for the repository.

## Dependencies

P01-S03 system architecture, P01-S04 security model.

## Personas

- **Lead:** `role-sdet-architect`
- **Reviewers / sign-off:** `role-scrum-master`, `role-fullstack-architect`, `role-devops-engineer`

## Scope

### Granular Implementation Tasks

1. Define the testing pyramid and coverage targets (master plan §10), with a ratchet policy (thresholds only go up).
2. Define the test infrastructure (D-09): PostgreSQL schema-per-worker isolation, ioredis-mock for unit tests only, a `test:contract` suite against real Redis, and CI service containers.
3. Define CI quality gates: lint, typecheck, test with coverage, test:contract, test:e2e, build, `npm audit --audit-level=high`, and secret scanning.
4. Define the test data strategy: seeded Faker factories, one org/project per test, and a deterministic local seed script.
5. List the critical E2E journeys (sign-up → first live run, two-browser live collaboration, quarantine lifecycle, invitation, notification delivery).
6. Review and update the existing AGENTS.md and `.agents/skills/` so they match the decisions made in P01-S01 to P01-S04.
7. Define conventional commit format, PR template, and branch strategy (trunk-based: short-lived `feat/` and `docs/` branches, release tags).
8. Refine the seeded scenario catalog (`docs/testing/scenario-catalog.md`) and the traceability rules (master plan D-15): every FR has at least one scenario, and every critical journey has an E2E scenario.

## Expected Files / Areas

`docs/testing/testing-strategy.md`, `docs/testing/scenario-catalog.md` (refined), `AGENTS.md` (update), `.agents/skills/*` (update), `CONTRIBUTING.md`

## Testing & Verification

Review the testing strategy for gaps, unrealistic coverage targets, Windows/Docker-free feasibility, and missing CI gates.

## Acceptance Criteria

- [ ] The testing pyramid is defined with coverage targets and a ratchet policy.
- [ ] The test infrastructure runs on a Windows machine without Docker, and CI gates are documented.
- [ ] The test data strategy is deterministic and practical.
- [ ] AGENTS.md and the skills are consistent with the Phase 01 decisions.
- [ ] Branch strategy and commit conventions are defined.

## Risks / Guardrails

Unrealistic 100% coverage targets; missing critical E2E scenarios; overly rigid agent rules; a test strategy that assumes Docker on developer machines.

## Antigravity Execution Prompt

```text
You are the documentation/design agent for TestPulse, Phase 01 — Sprint 05: Testing Strategy and Agent Operating Contract.
Act as: role-sdet-architect (load .agents/skills/role-sdet-architect/SKILL.md). Reviewers: role-scrum-master, role-fullstack-architect, role-devops-engineer.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts (§4–§8), Decision Log (§11), Open Decisions (§12)
3. planning/phases/01-phase-product-architecture-foundation.md
4. planning/sprints/P01-S05-testing-strategy-and-agent-contract.md — its Scope, Expected Files, Acceptance Criteria and Risks are the contract for this session.

BEFORE WRITING:
1. Confirm the sprint's dependencies are [x] in task.md; if not, stop and report.
2. Produce a short plan listing each deliverable and its path (paths must follow doc-implementation-standards).

EXECUTE every task under "Granular Implementation Tasks". Where a task resolves an item in master plan §12, record the decision as an ADR (or PRD section) and update master plan §11/§12 in the same change. Do not contradict the master plan silently — either align with it or propose an amendment explicitly.

AT COMPLETION:
- List the documents created/changed and how each acceptance criterion is satisfied.
- List any new open questions with the sprint that must close them.
- Update task.md.
```

## Sprint Definition of Done

- [ ] Every deliverable exists at the path listed in Expected Files / Areas.
- [ ] Content is consistent with the master plan; any change to a canonical contract is reflected in the master plan (§11 Decision Log / §12 Open Decisions).
- [ ] Open questions are listed with an owner sprint.
- [ ] New or changed requirements have `FR-*` IDs in `docs/product/feature-catalog.md`, with at least one `SC-*` scenario each.
- [ ] Reviewer personas have reviewed the deliverables against the acceptance criteria.
- [ ] `task.md` updated.
