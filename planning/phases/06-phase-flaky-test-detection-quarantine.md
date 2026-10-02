# Phase 06 — Flaky Test Detection & Quarantine

← [Phase 05](./05-phase-real-time-dashboard.md) | [Phase 07 →](./07-phase-notifications-integrations.md)

## Objective

Implement the core value proposition: automated flaky test detection and a structured quarantine lifecycle that replaces ad-hoc Slack threads.

## Outcome

TestPulse automatically identifies flaky tests, allows teams to annotate and quarantine them, enforces SLA deadlines, and tracks resolution metrics.

## Scope

- Flaky test detection (retry flakes, same-commit disagreement, transition heuristic on tracked branches)
- Flaky test badge and visual indicators on dashboard
- Quarantine lifecycle state machine (ACTIVE → INVESTIGATING → RESOLVED / DISMISSED)
- Quarantine creation with assignee, reason, and SLA due date (Member+ — master plan §7)
- SLA escalation markers (warning 80%, escalated 100%, overdue 200%) emitted as domain events
- Collaborative annotations (comments, labels, @mentions) on test cases
- Real-time annotation and quarantine sync via WebSocket
- Quarantine dashboard per project, with bulk operations
- Quarantine history and audit trail (`QuarantineTransition`)
- Ingest quarantine list for reporters (Q1)

Notifications for SLA events and mentions are **delivered in Phase 07**; this phase enqueues the domain events (master plan §6.2, D-12).

## Business Rules

```text
Flaky Detection (runs once per completed run, for the tests in that run):
  1. Retry flake: a result that failed then passed on retry (status FLAKY)
       -> SUSPECTED; >= 2 retry flakes within the window -> FLAKY.
  2. Same-commit disagreement: the same commitSha produced both PASSED and FAILED
       -> FLAKY.
  3. Transition heuristic on tracked branches (default: project.defaultBranch):
       over the last flakyWindow (10) results, with at least 5 samples,
       count pass<->fail transitions.
       transitions >= flakyThreshold (3) -> SUSPECTED; >= 5 -> FLAKY.
  4. A consistent regression (fail, fail, fail...) or a one-time fix (fail -> pass) is NOT flaky.
  5. Decay: 20 consecutive clean passes on tracked branches -> STABLE.
  6. Emit events only when the flaky state changes.

Quarantine SLA:
  1. Default SLA: 14 days.
  2. Configurable per project (7, 14, 30, 60 days) by Admin+.
  3. At 80% of SLA elapsed: set warnedAt, enqueue quarantine.sla_warning (assignee).
  4. At 100%: set escalatedAt, enqueue quarantine.sla_escalated (assignee + project admins).
  5. At 200%: set overdueFlaggedAt, enqueue quarantine.overdue (flagged for review in the dashboard).
  6. Each marker fires exactly once (idempotent job).
```

## State Machine

```text
            quarantine (Member+)
  (none) ─────────────────────────> [ACTIVE] ──assign/start──> [INVESTIGATING]
                                       │                              │
                                       ├──resolve (note)──> [RESOLVED] <──┤
                                       └──dismiss (reason)─> [DISMISSED] <─┘

  Escalation is tracked by markers (warnedAt / escalatedAt / overdueFlaggedAt), not states,
  so an INVESTIGATING quarantine can be escalated without losing its status.
  Closed records are never reopened; re-quarantining creates a new record.
  At most one open (ACTIVE / INVESTIGATING) record per test case.
```

## Testing

- Table-driven unit tests for the flaky algorithm (including regressions and fixes that must NOT be flagged)
- Unit tests for every valid and invalid quarantine transition
- Integration tests for annotation CRUD, mentions, and real-time sync
- Integration tests for the SLA job with a fake clock (each marker fires exactly once)
- E2E tests for the full quarantine lifecycle
- Edge case tests (no history, only passes, insufficient samples, feature-branch noise)

## Acceptance Criteria

- [ ] Flaky tests are automatically detected and badged, without flagging consistent regressions.
- [ ] Members can quarantine tests with an assignee and reason; Viewers cannot.
- [ ] Quarantine state transitions are enforced and audited.
- [ ] Annotations and quarantine changes sync in real time to all connected users.
- [ ] SLA markers are set and domain events enqueued at 80% / 100% / 200%.
- [ ] The quarantine dashboard shows all quarantines for the project, with bulk operations.

## Exit Criteria

A team member can see a test flagged as flaky, quarantine it, assign it to a colleague, add investigation notes, and resolve it — all reflected in real-time for the entire team.

## Sprint Decomposition

- P06-S01: Flaky test detection engine
- P06-S02: Quarantine lifecycle state machine
- P06-S03: Collaborative annotations, labels and mentions
- P06-S04: Quarantine dashboard and bulk operations
- P06-S05: SLA enforcement, escalation markers, and quarantine metrics
