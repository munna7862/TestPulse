# Phase 05 — Real-Time Dashboard

← [Phase 04](./04-phase-test-run-ingestion-data-model.md) | [Phase 06 →](./06-phase-flaky-test-detection-quarantine.md)

## Objective

Build the crown jewel: a live, real-time dashboard where teams watch test runs execute, see results stream in, and get instant visual feedback on test health.

## Outcome

When a CI pipeline runs, connected team members see test results appear on their dashboard in real-time — no page refresh required.

## Scope

- Socket.IO gateway with `@socket.io/redis-adapter` (delivers events already published by Phase 04 via `@socket.io/redis-emitter`)
- Cookie-authenticated client connection, room authorization, membership-revocation eviction
- Live test run progress view (streaming, virtualized results)
- Run summary cards (pass/fail/skip/flaky counts, duration, branch)
- Individual test case result view with expandable error details (fetched on demand)
- Test run list with filtering (status, branch, date range)
- Project-level dashboard with key metrics
- Connection status indicator, auto-reconnect, refetch-based catch-up
- REST polling fallback when the socket is unavailable
- Responsive layout (desktop-first, tablet-friendly)

## Architecture

```text
API handler / worker (after commit)
    |  RealtimePublisher.emit()  (@socket.io/redis-emitter)
    v
Redis
    |
    v
Socket.IO gateway instances (@socket.io/redis-adapter) — each delivers to its own sockets
    |
    +---> Room: project:{projectId}
    |     +---> run:started
    |     +---> run:progress   (one event per ingested batch, lean)
    |     +---> run:completed
    +---> Room: user:{userId}  (notifications, Phase 07)
    |
    v
React Client (single socket per tab)
    +---> patches React Query cache (idempotent), refetches after reconnect
    +---> Live run progress / run summary cards / result table
```

## UX Principle

The dashboard must answer four questions immediately:

```text
What is running right now?
How healthy is my test suite?
What just failed?
Is this failure new or known?
```

## Visual States

```text
Run In Progress (pulsing animation)
Run Passed (green; flaky results shown as an amber count, not a failure)
Run Failed (red with failure count)
Run Cancelled / Timed Out (neutral gray with reason)
Test Passed (green checkmark)
Test Failed (red X with expandable stack trace)
Test Skipped (gray dash)
Test Flaky — passed on retry (amber warning icon)
Connection Live (green dot)
Connection Reconnecting / Offline (amber / red dot; degraded-mode banner when polling)
```

Status is never conveyed by color alone (icon + label).

## Testing

- Unit tests for event schemas, room authorization, and client state machine
- Integration tests for the gateway (auth, join/leave acks, eviction)
- Contract test: two gateway instances + emitter → exactly one delivery per client
- E2E tests for the live dashboard (reporter example project → verify real-time update before run completes)
- Connection resilience tests (gateway restart, Redis restart → recovery without reload)
- Performance smoke test for 100 concurrent connections (full target of 1,000/instance in P10-S03)

## Acceptance Criteria

- [ ] Test results stream live to the dashboard within the master plan §10 latency target.
- [ ] Multiple team members see the same live state simultaneously, with no duplicate events.
- [ ] Only org members can join a project's room; removed members are evicted.
- [ ] Dashboard auto-reconnects and shows authoritative state after network disruption.
- [ ] Run history is browsable with filters.
- [ ] Error details are expandable and copy-able.
- [ ] UI remains responsive during a 10,000-result run.

## Exit Criteria

Two team members on different browsers watch the same test run execute in real-time.

## Sprint Decomposition

- P05-S01: WebSocket gateway (Socket.IO + Redis adapter)
- P05-S02: Socket.IO client integration and connection management
- P05-S03: Live test run progress view
- P05-S04: Run summary cards and run list with filters
- P05-S05: Individual test case detail view
- P05-S06: Connection resilience, polling fallback, and performance testing
