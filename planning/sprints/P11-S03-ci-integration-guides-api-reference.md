# Phase 11 — Sprint 03: CI Integration Guides and API Reference

## Sprint Objective

Write detailed CI integration guides for major providers and auto-generate API reference documentation.

## Dependencies

P11-S02 getting started guide.

## Personas

- **Lead:** `role-growth-engineer`, `role-backend-engineer`
- **Reviewers / sign-off:** `role-product-owner`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Write the GitHub Actions integration guide with workflow examples (including sharding and the GitHub reporting options).
2. Write the GitLab CI integration guide.
3. Write the Jenkins integration guide.
4. Generate the OpenAPI spec from the Zod route schemas (`@fastify/swagger`), scoped to the public ingestion API.
5. Host the API reference as interactive documentation in the docs portal.
6. Add API-key authentication examples (curl, Node) for each ingestion endpoint, for users of runners without a reporter.
7. Create a troubleshooting section (quota, rate limits, proxies, shards not joining, Windows paths).

## Expected Files / Areas

`apps/web/src/app/(docs)/docs/`, `docs/integrations/`, `apps/api/src/openapi/`

## Testing & Verification

Verify all code examples work. Test API reference against live endpoints. Review troubleshooting content.

## Acceptance Criteria

- [ ] The GitHub Actions integration guide is complete and tested.
- [ ] The GitLab CI and Jenkins guides are complete.
- [ ] The API reference is generated from the Zod schemas and is interactive.
- [ ] API-key authentication examples work against staging.
- [ ] Troubleshooting covers common issues.
- [ ] All code examples are verified in CI.

## Risks / Guardrails

API reference drifting from actual implementation; CI guide examples failing on specific runner versions.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 11 — Sprint 03: CI Integration Guides and API Reference.
Act as: role-growth-engineer + role-backend-engineer (load .agents/skills/role-growth-engineer/SKILL.md, .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-product-owner, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/11-phase-landing-page-docs-gtm.md
4. planning/sprints/P11-S03-ci-integration-guides-api-reference.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P11_S03.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P11-S03.md and update task.md.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] New or changed screens have loading, empty and error states and pass the axe-core check in light and dark themes.
- [ ] Acceptance criteria verified.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
