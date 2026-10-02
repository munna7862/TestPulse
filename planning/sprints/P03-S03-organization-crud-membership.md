# Phase 03 — Sprint 03: Organization & Project CRUD and Membership Model

## Sprint Objective

Implement organizations, projects, the membership model, the shared tenant-context resolver, and onboarding to the first project.

## Dependencies

P03-S02 OAuth integration.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Add `Organization` (with `planTier`, default FREE) and `OrgMember` (role enum) models per master plan §5.
2. Org endpoints: `POST /api/v1/orgs` (creator becomes OWNER), `GET /api/v1/orgs` (my memberships), `GET /api/v1/orgs/:orgId`, `PATCH /api/v1/orgs/:orgId` (Admin+), and `DELETE /api/v1/orgs/:orgId` (Owner; soft delete + async purge job).
3. Implement `resolveTenantContext()` and the preHandler that resolves org/project → membership → role. Non-members get 404.
4. Add the `Project` model with settings defaults (master plan §5) and CRUD under `/api/v1/orgs/:orgId/projects` (writes Admin+). Enforce the plan project limit (`403 PLAN_LIMIT_REACHED`).
5. `GET /api/v1/orgs/:orgId/members` (any member).
6. Ownership transfer (Owner only; the previous owner becomes Admin).
7. Add `@testpulse/shared/src/plans.ts` with plan limits and a pure `checkLimit()` helper.
8. Onboarding: after a first sign-up that did not come from an invitation, guide the user to create an org and a first project (the first steps of the golden-path checklist).
9. Web: org switcher, create org/project dialogs, and basic project settings page.

## Expected Files / Areas

`packages/db/prisma/schema.prisma`, `packages/shared/src/plans.ts`, `apps/api/src/modules/orgs/`, `apps/api/src/modules/projects/`, `apps/api/src/plugins/tenant-context.ts`, `apps/web/src/app/(app)/`

## Testing & Verification

Integration tests for org and project CRUD, role checks (403), non-member access (404), plan limit enforcement, and ownership transfer.

## Acceptance Criteria

- [ ] Users can create organizations, and the creator is the OWNER.
- [ ] Users can list their organizations and switch between them.
- [ ] Projects can be created, updated, and deleted by Admin+, within plan limits.
- [ ] Non-members receive 404 on org and project endpoints; under-privileged members receive 403.
- [ ] Ownership can be transferred, and the Owner cannot be removed.
- [ ] A new user can reach their first project through onboarding.

## Risks / Guardrails

Missing tenant context in queries; OWNER role accidentally removable; org and project slug collisions; deleting an org synchronously (large data); leaking org existence through 403 vs 404.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03 — Sprint 03: Organization & Project CRUD and Membership Model.
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/03-phase-authentication-multi-tenancy.md
4. planning/sprints/P03-S03-organization-crud-membership.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P03_S03.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P03-S03.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] New or changed screens have loading, empty and error states and pass the axe-core check in light and dark themes.
- [ ] Acceptance criteria verified.
- [ ] Feature catalog status and scenario catalog "Automated by" entries updated; tests carry `[SC-*]` IDs in their titles.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
