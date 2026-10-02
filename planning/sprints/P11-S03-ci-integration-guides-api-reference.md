# Phase 11 — Sprint 03: CI Integration Guides and API Reference

## Sprint Objective

Write detailed CI integration guides for major providers and auto-generate API reference documentation.

## Dependencies

P11-S02 getting started guide.

## Scope

### Granular Implementation Tasks

1. Write GitHub Actions integration guide with workflow examples.
2. Write GitLab CI integration guide.
3. Write Jenkins integration guide.
4. Auto-generate API reference from Zod schemas (Swagger/OpenAPI).
5. Host API reference as interactive documentation.
6. Add authentication examples (API key, JWT) for each endpoint.
7. Create troubleshooting section for common integration issues.

## Expected Files / Areas

`docs/integrations/`, `apps/api/src/openapi/`

## Testing & Verification

Verify all code examples work. Test API reference against live endpoints. Review troubleshooting content.

## Acceptance Criteria

- [ ] GitHub Actions integration guide is complete and tested.
- [ ] GitLab CI integration guide is complete.
- [ ] API reference is auto-generated and interactive.
- [ ] Authentication examples work for all methods.
- [ ] Troubleshooting covers common issues.
- [ ] All code examples are verified.

## Risks / Guardrails

API reference drifting from actual implementation; CI guide examples failing on specific runner versions.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 11, Sprint 03: CI Integration Guides and API Reference.

OBJECTIVE:
Write detailed CI integration guides for major providers and auto-generate API reference documentation.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Write GitHub Actions integration guide with workflow examples.
2. Write GitLab CI integration guide.
3. Write Jenkins integration guide.
4. Auto-generate API reference from Zod schemas (Swagger/OpenAPI).
5. Host API reference as interactive documentation.
6. Add authentication examples (API key, JWT) for each endpoint.
7. Create troubleshooting section for common integration issues.

TEST:
Verify all code examples work. Test API reference against live endpoints. Review troubleshooting content.

ACCEPTANCE:
- [ ] GitHub Actions integration guide is complete and tested.
- [ ] GitLab CI integration guide is complete.
- [ ] API reference is auto-generated and interactive.
- [ ] Authentication examples work for all methods.
- [ ] Troubleshooting covers common issues.
- [ ] All code examples are verified.

GUARDRAILS:
API reference drifting from actual implementation; CI guide examples failing on specific runner versions.

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
