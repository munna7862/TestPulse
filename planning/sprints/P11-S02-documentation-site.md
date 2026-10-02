# Phase 11 — Sprint 02: Documentation Site Setup and Getting Started Guide

## Sprint Objective

Set up a documentation site and write the getting-started guide that takes users from zero to first live test run.

## Dependencies

P11-S01 landing page.

## Personas

- **Lead:** `role-growth-engineer`
- **Reviewers / sign-off:** `role-product-owner`, `role-backend-engineer`

## Scope

### Granular Implementation Tasks

1. Set up the docs portal with Next.js MDX in apps/web (`/docs`), sharing the design system.
2. Write the Getting Started guide (sign up, create org and project, generate an API key).
3. Write the reporter quickstart for Playwright and Vitest (install, configure, run, watch it live).
4. Write a 'How TestPulse works' concepts page (runs, shards, flaky states, quarantine, SLA).
5. Write the FAQ section.
6. Add code examples with syntax highlighting, sourced from the tested `examples/` projects.
7. Implement documentation search (e.g. Pagefind or FlexSearch, built at compile time).
8. Add breadcrumb navigation and a sidebar.

## Expected Files / Areas

`apps/web/src/app/(docs)/docs/`

## Testing & Verification

Link verification (no broken links). Content review for accuracy. Time-to-value measurement (can new user follow the guide?).

## Acceptance Criteria

- [ ] Documentation site is live and navigable.
- [ ] Getting started guide covers sign-up to first run.
- [ ] CI integration guide has working code examples.
- [ ] Documentation search works.
- [ ] All links are valid.
- [ ] Guide is achievable in under 10 minutes.

## Risks / Guardrails

Documentation out of sync with actual product; code examples not tested; missing screenshots.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 11 — Sprint 02: Documentation Site Setup and Getting Started Guide.
Act as: role-growth-engineer (load .agents/skills/role-growth-engineer/SKILL.md). Reviewers: role-product-owner, role-backend-engineer.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/11-phase-landing-page-docs-gtm.md
4. planning/sprints/P11-S02-documentation-site.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P11_S02.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P11-S02.md and update task.md.
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
