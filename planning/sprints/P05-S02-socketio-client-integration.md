# Phase 05 — Sprint 02: Socket.IO Client Integration and Connection Management

## Sprint Objective

Implement the React-side Socket.IO client with connection lifecycle management, auto-reconnect, and state synchronization.

## Dependencies

P05-S01 WebSocket infrastructure.

## Scope

### Granular Implementation Tasks

1. Install socket.io-client in apps/web.
2. Create useSocket React hook with connection lifecycle management.
3. Implement automatic JWT-authenticated connection on login.
4. Implement auto-reconnect with exponential backoff.
5. Create connection status indicator component (connected/reconnecting/disconnected).
6. Implement room subscription management (join/leave project rooms).
7. Create event listener hooks (useSocketEvent) for type-safe event handling.
8. Handle token refresh during active WebSocket connection.

## Expected Files / Areas

`apps/web/src/hooks/useSocket.ts`, `apps/web/src/components/ConnectionStatus.tsx`

## Testing & Verification

Unit tests for connection state machine. E2E tests for connect, disconnect, and reconnect scenarios.

## Acceptance Criteria

- [ ] Socket.IO client connects with JWT authentication.
- [ ] Connection status indicator shows current state.
- [ ] Auto-reconnect works after network disruption.
- [ ] Room subscriptions update when navigating between projects.
- [ ] Event listeners are properly cleaned up on unmount.
- [ ] Token refresh does not break the WebSocket connection.

## Risks / Guardrails

Memory leaks from uncleared event listeners; reconnect storms; stale JWT on long-lived connections.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05, Sprint 02: Socket.IO Client Integration and Connection Management.

OBJECTIVE:
Implement the React-side Socket.IO client with connection lifecycle management, auto-reconnect, and state synchronization.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Install socket.io-client in apps/web.
2. Create useSocket React hook with connection lifecycle management.
3. Implement automatic JWT-authenticated connection on login.
4. Implement auto-reconnect with exponential backoff.
5. Create connection status indicator component (connected/reconnecting/disconnected).
6. Implement room subscription management (join/leave project rooms).
7. Create event listener hooks (useSocketEvent) for type-safe event handling.
8. Handle token refresh during active WebSocket connection.

TEST:
Unit tests for connection state machine. E2E tests for connect, disconnect, and reconnect scenarios.

ACCEPTANCE:
- [ ] Socket.IO client connects with JWT authentication.
- [ ] Connection status indicator shows current state.
- [ ] Auto-reconnect works after network disruption.
- [ ] Room subscriptions update when navigating between projects.
- [ ] Event listeners are properly cleaned up on unmount.
- [ ] Token refresh does not break the WebSocket connection.

GUARDRAILS:
Memory leaks from uncleared event listeners; reconnect storms; stale JWT on long-lived connections.

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
