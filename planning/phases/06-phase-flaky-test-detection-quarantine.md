# Phase 06 — Flaky Test Detection & Quarantine

← [Phase 05](./05-phase-real-time-dashboard.md) | [Phase 07 →](./07-phase-notifications-integrations.md)

## Objective

Implement the core value proposition: automated flaky test detection and a structured quarantine lifecycle that replaces ad-hoc Slack threads.

## Outcome

TestPulse automatically identifies flaky tests, allows teams to annotate and quarantine them, enforces SLA deadlines, and tracks resolution metrics.

## Scope

- Flaky test heuristic engine (alternating pass/fail detection)
- Flaky test badge and visual indicators on dashboard
- Quarantine lifecycle state machine (active -> investigating -> resolved/dismissed)
- Quarantine creation with assignee, deadline, and notes
- Quarantine escalation when SLA expires
- Collaborative annotations (comments, tags) on test cases
- Real-time annotation sync via WebSocket
- Quarantine dashboard (all quarantined tests, grouped by project)
- Bulk quarantine operations
- Quarantine history and audit trail

## Business Rules

```text
Flaky Detection Algorithm:
  1. Look at the last 10 runs for a test case.
  2. Count the number of status transitions (pass->fail or fail->pass).
  3. If transitions >= 3, mark as "likely flaky."
  4. If transitions >= 5, mark as "definitely flaky."
  5. Recalculate on every new run result.

Quarantine SLA:
  1. Default SLA: 14 days.
  2. Configurable per project (7, 14, 30, 60 days).
  3. At 80% of SLA elapsed, send warning notification.
  4. At 100% of SLA elapsed, escalate to project admin.
  5. Quarantine records older than 2x SLA are auto-flagged for review.
```

## State Machine

```text
[New] --quarantine--> [Active] --assign--> [Investigating]
                         |                       |
                         |                       +--resolve--> [Resolved]
                         |                       |
                         |                       +--dismiss--> [Dismissed]
                         |
                         +--auto-escalate--> [Escalated]
```

## Testing

- Unit tests for flaky detection algorithm
- Unit tests for quarantine state machine transitions
- Integration tests for annotation CRUD and real-time sync
- E2E tests for full quarantine lifecycle
- Edge case tests (test with 0 history, test with only passes, etc.)

## Acceptance Criteria

- [ ] Flaky tests are automatically detected and badged.
- [ ] Users can quarantine tests with assignee and deadline.
- [ ] Quarantine state transitions are enforced.
- [ ] Annotations sync in real-time to all connected users.
- [ ] SLA escalation triggers notifications.
- [ ] Quarantine dashboard shows all quarantined tests across projects.

## Exit Criteria

A team member can see a test flagged as flaky, quarantine it, assign it to a colleague, add investigation notes, and resolve it — all reflected in real-time for the entire team.

## Sprint Decomposition

- P05-S01: Flaky test detection heuristic engine
- P06-S02: Quarantine lifecycle state machine
- P06-S03: Collaborative annotations (comments, tags, assignments)
- P06-S04: Quarantine dashboard and bulk operations
- P06-S05: SLA enforcement, escalation, and quarantine metrics
