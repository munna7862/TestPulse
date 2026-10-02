# Phase 07 — Notifications & Integrations

← [Phase 06](./06-phase-flaky-test-detection-quarantine.md) | [Phase 08 →](./08-phase-analytics-reporting.md)

## Objective

Keep teams informed and connected. Build a notification system for in-app alerts, email digests, and webhook integrations.

## Outcome

Team members are proactively notified about test failures, quarantine escalations, and critical events — without needing to constantly watch the dashboard.

## Scope

- In-app notification center (bell icon, unread count, notification list)
- Email notifications (configurable per user)
- Notification preferences (per-project, per-event-type)
- GitHub CI reporter plugin (post results as PR check/comment)
- Webhook system for custom integrations
- Background job system (BullMQ) for notification delivery
- Notification templates (email HTML, in-app)
- Rate limiting and digest batching for noisy projects

## Event Types

```text
run:failed         - A test run completed with failures
run:recovered      - A previously failing run is now green
test:new_failure   - A test that was passing is now failing
test:flaky         - A test was detected as flaky
quarantine:created - A test was quarantined
quarantine:warning - Quarantine SLA at 80%
quarantine:expired - Quarantine SLA expired (escalation)
quarantine:resolved - A quarantine was resolved
member:invited     - A team member was invited
```

## Testing

- Unit tests for notification routing logic
- Integration tests for email delivery (test SMTP)
- Integration tests for webhook delivery
- E2E tests for in-app notification flow
- Rate limiting and batching tests

## Acceptance Criteria

- [ ] In-app notifications appear in real-time.
- [ ] Email notifications are sent for configured events.
- [ ] Users can configure notification preferences per project.
- [ ] GitHub reporter posts test results as PR checks.
- [ ] Webhooks fire reliably with retry on failure.
- [ ] Notification rate limiting prevents spam.

## Exit Criteria

A test failure triggers an in-app notification, an email to the project admin, and a GitHub PR check — all automatically.

## Sprint Decomposition

- P07-S01: In-app notification center and real-time delivery
- P07-S02: Email notification system (templates, SMTP, preferences)
- P07-S03: Notification preferences and digest batching
- P07-S04: GitHub CI reporter plugin (PR checks and comments)
- P07-S05: Webhook system for custom integrations
