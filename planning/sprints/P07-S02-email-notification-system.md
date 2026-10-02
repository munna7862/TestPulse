# Phase 07 — Sprint 02: Email Notification System

## Sprint Objective

Implement email notification delivery with HTML templates, SMTP configuration, and user preferences.

## Dependencies

P07-S01 in-app notifications.

## Scope

### Granular Implementation Tasks

1. Set up email delivery service (Resend, SendGrid, or Nodemailer with SMTP).
2. Create HTML email templates for key events (run failed, quarantine escalation, invitation).
3. Implement email sending via background job (BullMQ) for reliability.
4. Add retry logic with exponential backoff for failed deliveries.
5. Create email preview route for template development (dev only).
6. Implement unsubscribe links in all emails.
7. Add email delivery logging and monitoring.

## Expected Files / Areas

`apps/api/src/modules/notifications/email/`, `apps/api/src/jobs/email.ts`

## Testing & Verification

Integration tests for email sending (mock SMTP). Template rendering tests. Unsubscribe flow tests.

## Acceptance Criteria

- [ ] Email notifications are sent for configured events.
- [ ] HTML templates render correctly across email clients.
- [ ] Failed emails are retried with backoff.
- [ ] Unsubscribe links work correctly.
- [ ] Email delivery is logged for monitoring.
- [ ] No emails sent to users who unsubscribed.

## Risks / Guardrails

Email delivery delays; HTML rendering inconsistency across clients; unsubscribe link not honored.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07, Sprint 02: Email Notification System.

OBJECTIVE:
Implement email notification delivery with HTML templates, SMTP configuration, and user preferences.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Set up email delivery service (Resend, SendGrid, or Nodemailer with SMTP).
2. Create HTML email templates for key events (run failed, quarantine escalation, invitation).
3. Implement email sending via background job (BullMQ) for reliability.
4. Add retry logic with exponential backoff for failed deliveries.
5. Create email preview route for template development (dev only).
6. Implement unsubscribe links in all emails.
7. Add email delivery logging and monitoring.

TEST:
Integration tests for email sending (mock SMTP). Template rendering tests. Unsubscribe flow tests.

ACCEPTANCE:
- [ ] Email notifications are sent for configured events.
- [ ] HTML templates render correctly across email clients.
- [ ] Failed emails are retried with backoff.
- [ ] Unsubscribe links work correctly.
- [ ] Email delivery is logged for monitoring.
- [ ] No emails sent to users who unsubscribed.

GUARDRAILS:
Email delivery delays; HTML rendering inconsistency across clients; unsubscribe link not honored.

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
