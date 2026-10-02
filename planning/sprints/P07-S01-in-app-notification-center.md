# Phase 07 — Sprint 01: In-App Notification Center and Real-Time Delivery

## Sprint Objective

Deliver in-app notifications in real time by routing the domain events produced in Phases 04–06 to the right users.

## Dependencies

Phase 06 complete (quarantine and annotations).

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`, `role-realtime-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Add the `Notification` model per master plan §5.
2. Notification router (worker) consuming the `domain-events` queue: map each event to recipients (assignee, mentioned user, project admins), create notification rows with a per-event-per-user dedupe key, and emit `notification:new` to `user:{userId}`.
3. Default routing table (used until preferences exist in P07-S03): SLA warning → assignee; SLA escalation/overdue → assignee + project admins; mention → mentioned user; quarantine created/closed → assignee.
4. NotificationCenter UI in the app-shell slot: bell with unread count and a dropdown list.
5. Mark as read (single and all).
6. `GET /api/v1/notifications` (the current user's notifications, filterable by org, cursor-paginated).
7. Click-through via `linkPath`.
8. Cleanup job: delete read notifications older than 90 days.

## Expected Files / Areas

`apps/api/src/modules/notifications/`, `apps/api/src/jobs/notification-router.ts`, `apps/web/src/features/notifications/`

## Testing & Verification

Integration tests for routing (correct recipients, no cross-org recipients, dedupe on retry). E2E: an SLA warning (fake clock) and an @mention each produce a live notification.

## Acceptance Criteria

- [ ] SLA events from P06-S05 and mentions from P06-S03 produce notifications end to end.
- [ ] Notifications are delivered in real time to the user's room only.
- [ ] The unread count badge updates dynamically.
- [ ] The notification list is paginated, and mark-as-read works individually and in bulk.
- [ ] Click-through navigates to the relevant page.

## Risks / Guardrails

Notification flooding from noisy projects; leaking notifications across users or orgs; duplicate notifications on job retries.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07 — Sprint 01: In-App Notification Center and Real-Time Delivery.
Act as: role-backend-engineer + role-frontend-engineer + role-realtime-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md, .agents/skills/role-realtime-engineer/SKILL.md). Reviewers: role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/07-phase-notifications-integrations.md
4. planning/sprints/P07-S01-in-app-notification-center.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P07_S01.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P07-S01.md and update task.md.
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
