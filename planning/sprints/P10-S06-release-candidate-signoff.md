# Phase 10 — Sprint 06: Release Candidate Build and Sign-Off

## Sprint Objective

Build the release candidate, run the final quality gates, and obtain sign-off for v1.0 production release.

## Dependencies

P10-S05 staging validation.

## Scope

### Granular Implementation Tasks

1. Create release branch (release/v1.0.0).
2. Run complete quality gate checklist (lint, typecheck, unit, integration, E2E, security, performance).
3. Verify all acceptance criteria from all phases.
4. Create CHANGELOG.md with all features, fixes, and known limitations.
5. Update version numbers across all packages.
6. Create production deployment plan with rollback strategy.
7. Prepare post-launch monitoring dashboard.
8. Obtain final sign-off from human reviewer.

## Expected Files / Areas

`CHANGELOG.md`, `docs/release-plan.md`

## Testing & Verification

Run all quality gates. Review CHANGELOG. Review deployment plan. Final human sign-off.

## Acceptance Criteria

- [ ] All quality gates pass (lint, typecheck, test, build, security, performance).
- [ ] CHANGELOG documents all features and known limitations.
- [ ] Version numbers are updated across all packages.
- [ ] Deployment plan includes rollback strategy.
- [ ] Monitoring dashboard is prepared.
- [ ] Human sign-off is obtained.

## Risks / Guardrails

Last-minute critical bug; quality gate regression; missing known limitation documentation.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 10, Sprint 06: Release Candidate Build and Sign-Off.

OBJECTIVE:
Build the release candidate, run the final quality gates, and obtain sign-off for v1.0 production release.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create release branch (release/v1.0.0).
2. Run complete quality gate checklist (lint, typecheck, unit, integration, E2E, security, performance).
3. Verify all acceptance criteria from all phases.
4. Create CHANGELOG.md with all features, fixes, and known limitations.
5. Update version numbers across all packages.
6. Create production deployment plan with rollback strategy.
7. Prepare post-launch monitoring dashboard.
8. Obtain final sign-off from human reviewer.

TEST:
Run all quality gates. Review CHANGELOG. Review deployment plan. Final human sign-off.

ACCEPTANCE:
- [ ] All quality gates pass (lint, typecheck, test, build, security, performance).
- [ ] CHANGELOG documents all features and known limitations.
- [ ] Version numbers are updated across all packages.
- [ ] Deployment plan includes rollback strategy.
- [ ] Monitoring dashboard is prepared.
- [ ] Human sign-off is obtained.

GUARDRAILS:
Last-minute critical bug; quality gate regression; missing known limitation documentation.

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
