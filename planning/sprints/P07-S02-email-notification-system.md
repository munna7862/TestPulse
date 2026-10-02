# Phase 07 — Sprint 02: Email Notification System

## Sprint Objective

Send notification emails reliably through a queue, building on the P03-S01 Mailer, with templates and one-click unsubscribe.

## Dependencies

P07-S01 in-app notifications.

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Extend the P03-S01 `Mailer` with an email BullMQ queue and the provider chosen in Q5.
2. Templates (React Email or MJML) for quarantine SLA warning and escalation, mention, run failed (opt-in), and invitation. Migrate the P03 verification and reset emails to the template system.
3. Retry with exponential backoff, with an idempotency key per notification.
4. Dev-only email preview route.
5. One-click unsubscribe per category (signed token, `List-Unsubscribe` headers). Security emails (verification, reset, invitations) cannot be unsubscribed.
6. Delivery logging (provider message ID) and basic bounce handling (mark the address undeliverable).
7. Configure the sending domain (SPF, DKIM, DMARC) for staging and production.

## Expected Files / Areas

`apps/api/src/lib/mailer/`, `apps/api/src/jobs/email.ts`, `apps/api/src/emails/`

## Testing & Verification

Integration tests with a fake provider (retries, idempotency, unsubscribe honored). Template rendering snapshot tests. An unsubscribe flow test.

## Acceptance Criteria

- [ ] Notification emails are sent for configured events.
- [ ] Templates render correctly (snapshot-tested, checked in common clients).
- [ ] Failed sends are retried with backoff, without duplicate emails.
- [ ] Unsubscribe links work, and no non-security email reaches an unsubscribed user.
- [ ] Email delivery is logged for monitoring.

## Risks / Guardrails

Email delivery delays; landing in spam (domain authentication); duplicate sends on retry; unsubscribe not honored.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07 — Sprint 02: Email Notification System.
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/07-phase-notifications-integrations.md
4. planning/sprints/P07-S02-email-notification-system.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P07_S02.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P07-S02.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] Acceptance criteria verified.
- [ ] Feature catalog status and scenario catalog "Automated by" entries updated; tests carry `[SC-*]` IDs in their titles.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
