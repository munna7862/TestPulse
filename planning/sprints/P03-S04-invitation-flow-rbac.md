# Phase 03 — Sprint 04: Invitation Flow and Role-Based Access Control

## Sprint Objective

Implement team member invitation, acceptance, and comprehensive RBAC enforcement on all API endpoints.

## Dependencies

P03-S03 organization CRUD.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Add the `Invitation` model (hashed token, 7-day expiry, single use, bound to the invited email).
2. `POST /api/v1/orgs/:orgId/invitations` (Admin+), plus list, revoke, and resend. Pending invites count toward the member limit.
3. Send invitation emails through the P03-S01 Mailer.
4. `POST /api/v1/invitations/accept`: authenticated, and the user's verified email must match the invited email.
5. Define the permission map in `@testpulse/shared` from master plan §7. It is the single source used by API guards (`requireRole`) and by the UI (hide or disable controls).
6. Role changes (Admin+). Nobody can grant or remove the Owner role, except through ownership transfer.
7. Member removal (Admin+, cannot target the Owner) and self-leave.
8. On removal or downgrade, publish a `member.access_changed` internal event so sockets can be evicted (consumed in P05-S01).
9. Web: members page, invite dialog, pending invitations list, and accept-invitation page.

## Expected Files / Areas

`packages/shared/src/permissions.ts`, `apps/api/src/plugins/rbac.ts`, `apps/api/src/modules/invitations/`, `apps/web/src/app/(app)/[org]/settings/members/`

## Testing & Verification

Unit tests for the permission map. Integration tests for the invitation lifecycle (expired, revoked, reused, wrong email). Privilege-escalation tests (a Member promoting themself, an Admin granting Owner).

## Acceptance Criteria

- [ ] Admin+ can invite new members, within the plan member limit.
- [ ] Invited users with a matching verified email can accept and join.
- [ ] RBAC is enforced on all endpoints from the shared permission map.
- [ ] Members cannot escalate their own role, and nobody can grant Owner outside ownership transfer.
- [ ] The Owner cannot be removed or have their role changed.
- [ ] Expired, revoked, or already-used invitations cannot be accepted.

## Risks / Guardrails

Privilege escalation via direct API manipulation; invitation token reuse or forwarding to a different email; permission logic duplicated between UI and API.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03 — Sprint 04: Invitation Flow and Role-Based Access Control.
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/03-phase-authentication-multi-tenancy.md
4. planning/sprints/P03-S04-invitation-flow-rbac.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P03_S04.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P03-S04.md and update task.md.
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
