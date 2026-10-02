# Phase 05 — Sprint 06: Connection Resilience, Polling Fallback, and Performance Testing

## Sprint Objective

Harden the real-time system: add polling fallback, test connection resilience, and verify performance under load.

## Dependencies

P05-S05 test case detail view.

## Scope

### Granular Implementation Tasks

1. Implement polling fallback when WebSocket is unavailable or behind corporate proxies.
2. Create reconnection state recovery (fetch missed events after reconnect).
3. Implement event deduplication (prevent duplicate results on reconnect).
4. Add WebSocket health monitoring (ping/pong, connection age tracking).
5. Performance test: 100 concurrent WebSocket connections receiving events.
6. Performance test: 1000 results/second ingestion with 50 connected clients.
7. Add client-side event buffering for offline resilience.
8. Create degraded-mode banner when falling back to polling.

## Expected Files / Areas

`apps/web/src/hooks/useSocket.ts`, `tests/performance/`

## Testing & Verification

Connection resilience tests (kill server, verify reconnect). Load tests for concurrent connections and event throughput.

## Acceptance Criteria

- [ ] Polling fallback activates when WebSocket is unavailable.
- [ ] State recovery fetches missed events after reconnect.
- [ ] No duplicate events displayed on reconnect.
- [ ] 100 concurrent connections perform within latency SLA.
- [ ] 1000 results/second ingestion works with 50 clients.
- [ ] Degraded-mode banner shows when using polling.

## Risks / Guardrails

Event deduplication collisions; polling interval too aggressive (server load); memory growth from event buffering.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05, Sprint 06: Connection Resilience, Polling Fallback, and Performance Testing.

OBJECTIVE:
Harden the real-time system: add polling fallback, test connection resilience, and verify performance under load.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Implement polling fallback when WebSocket is unavailable or behind corporate proxies.
2. Create reconnection state recovery (fetch missed events after reconnect).
3. Implement event deduplication (prevent duplicate results on reconnect).
4. Add WebSocket health monitoring (ping/pong, connection age tracking).
5. Performance test: 100 concurrent WebSocket connections receiving events.
6. Performance test: 1000 results/second ingestion with 50 connected clients.
7. Add client-side event buffering for offline resilience.
8. Create degraded-mode banner when falling back to polling.

TEST:
Connection resilience tests (kill server, verify reconnect). Load tests for concurrent connections and event throughput.

ACCEPTANCE:
- [ ] Polling fallback activates when WebSocket is unavailable.
- [ ] State recovery fetches missed events after reconnect.
- [ ] No duplicate events displayed on reconnect.
- [ ] 100 concurrent connections perform within latency SLA.
- [ ] 1000 results/second ingestion works with 50 clients.
- [ ] Degraded-mode banner shows when using polling.

GUARDRAILS:
Event deduplication collisions; polling interval too aggressive (server load); memory growth from event buffering.

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
