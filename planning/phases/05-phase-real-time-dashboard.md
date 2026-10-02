# Phase 05 — Real-Time Dashboard

← [Phase 04](./04-phase-test-run-ingestion-data-model.md) | [Phase 06 →](./06-phase-flaky-test-detection-quarantine.md)

## Objective

Build the crown jewel: a live, real-time dashboard where teams watch test runs execute, see results stream in, and get instant visual feedback on test health.

## Outcome

When a CI pipeline runs, connected team members see test results appear on their dashboard in real-time — no page refresh required.

## Scope

- WebSocket infrastructure (Socket.IO server + client)
- Redis pub/sub integration for event broadcasting
- Live test run progress view (streaming results)
- Run summary cards (pass/fail/skip counts, duration, branch)
- Individual test case result view with expandable error details
- Test run list with filtering (status, branch, date range)
- Project-level dashboard with key metrics
- Connection status indicator and auto-reconnect
- Polling fallback when WebSocket is unavailable
- Responsive layout (desktop-first, tablet-friendly)

## Architecture

```text
Redis Pub/Sub
    |
    v
Socket.IO Server
    |
    +---> Room: project:{projectId}
    |     |
    |     +---> Event: run:started
    |     +---> Event: run:result (per test)
    |     +---> Event: run:completed
    |
    v
React Client (Socket.IO Client)
    |
    +---> Live run progress component
    +---> Run summary cards
    +---> Result table with streaming updates
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
Run Passed (green)
Run Failed (red with failure count)
Run Partially Passed (amber)
Test Passed (green checkmark)
Test Failed (red X with expandable stack trace)
Test Skipped (gray dash)
Test Flaky (amber warning icon)
Connection Active (green dot)
Connection Lost (red dot with reconnecting animation)
```

## Testing

- Unit tests for WebSocket event handlers
- Integration tests for pub/sub pipeline (ingest -> redis -> socket -> client)
- E2E tests for live dashboard (trigger run -> verify real-time update)
- Connection resilience tests (disconnect -> reconnect -> state recovery)
- Performance test for 100 concurrent connections

## Acceptance Criteria

- [ ] Test results stream live to the dashboard within 200ms of ingestion.
- [ ] Multiple team members see the same live state simultaneously.
- [ ] Dashboard auto-reconnects after network disruption.
- [ ] Run history is browsable with filters.
- [ ] Error details are expandable and copy-able.
- [ ] UI remains responsive during high-throughput runs.

## Exit Criteria

Two team members on different browsers watch the same test run execute in real-time.

## Sprint Decomposition

- P05-S01: WebSocket infrastructure (Socket.IO server + Redis pub/sub)
- P05-S02: Socket.IO client integration and connection management
- P05-S03: Live test run progress view
- P05-S04: Run summary cards and run list with filters
- P05-S05: Individual test case detail view
- P05-S06: Connection resilience, polling fallback, and performance testing
