# Phase 07 — Sprint 03: Notification Preferences and Digest Batching

## Sprint Objective

Let users choose which notifications they receive and where, and batch noisy events into digests.

## Dependencies

P07-S02 email notifications.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Add the `NotificationPreference` model per master plan §5.
2. Notification preferences page (per project × event type × channel), with sensible defaults.
3. The router honors preferences. Security emails are always sent.
4. Email digests (hourly or daily) for high-volume event types (`run.failed`, `test.new_failure`). SLA escalations are always immediate.
5. Project-level defaults (Admin+) that apply to members without explicit preferences.
6. A per-user hourly cap on non-critical emails; overflow rolls into the next digest.
7. Deferred (post-MVP, do not build): quiet hours and the per-project volume indicator.

## Expected Files / Areas

`apps/api/src/modules/notifications/preferences/`, `apps/api/src/jobs/digest.ts`, `apps/web/src/features/settings/notifications/`

## Testing & Verification

Integration tests for preference-based routing and defaults. Tests for digest batching with a fake clock. E2E for the preferences UI.

## Acceptance Criteria

- [ ] Users can configure preferences per project and event type.
- [ ] Preferences route notifications to the chosen channels.
- [ ] Digest batching groups events into a single email on schedule.
- [ ] Project-level defaults apply to members without their own preferences.
- [ ] Critical notifications are never delayed by digests.

## Risks / Guardrails

Digest batching delaying critical notifications; preference migration when new event types are added (default new types explicitly).

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07 — Sprint 03: Notification Preferences and Digest Batching.
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/07-phase-notifications-integrations.md
4. planning/sprints/P07-S03-notification-preferences-digests.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P07_S03.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P07-S03.md and update task.md.
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
