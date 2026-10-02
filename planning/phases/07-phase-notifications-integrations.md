# Phase 07 — Notifications & Integrations

← [Phase 06](./06-phase-flaky-test-detection-quarantine.md) | [Phase 08 →](./08-phase-analytics-reporting.md)

## Objective

Keep teams informed and connected. Build a notification system for in-app alerts, email digests, and webhook integrations.

## Outcome

Team members are proactively notified about test failures, quarantine escalations, and critical events — without needing to constantly watch the dashboard.

## Scope

- Notification router consuming the domain events produced in Phases 04–06 (master plan §6.2)
- In-app notification center (bell icon, unread count, notification list)
- Email notifications built on the P03-S01 `Mailer` (queued, templated, one-click unsubscribe)
- Notification preferences (per-project, per-event-type)
- GitHub CI reporting from the reporter using `GITHUB_TOKEN` (job summary, PR comment, check run), with no server-side GitHub App (D-07)
- Webhook system for custom integrations (HMAC-signed, SSRF-protected, encrypted secrets)
- Background job system (BullMQ) for notification delivery
- Notification templates (email HTML, in-app)
- Rate limiting and digest batching for noisy projects

## Event Types

These are **domain events** (BullMQ `domain-events` queue), not Socket.IO events. Producers already exist from Phases 03–06; this phase adds the consumers.

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
- Integration tests for email delivery (fake provider / test transport)
- Integration tests for webhook delivery
- E2E tests for in-app notification flow
- Rate limiting and batching tests

## Acceptance Criteria

- [ ] In-app notifications appear in real-time.
- [ ] Email notifications are sent for configured events.
- [ ] Users can configure notification preferences per project.
- [ ] GitHub reporting posts a job summary, PR comment, and check run without ever failing CI.
- [ ] Webhooks fire reliably with retry on failure.
- [ ] Notification rate limiting prevents spam.

## Exit Criteria

An SLA escalation triggers an in-app notification and an email to the assignee and project admins. A failing CI run shows its TestPulse summary on the GitHub PR. A customer webhook receives a signed event. All of this happens automatically and according to user preferences.

## Sprint Decomposition

- P07-S01: In-app notification center and real-time delivery
- P07-S02: Email notification system (templates, SMTP, preferences)
- P07-S03: Notification preferences and digest batching
- P07-S04: GitHub CI reporting (job summary, PR comment and check run)
- P07-S05: Webhook system for custom integrations
