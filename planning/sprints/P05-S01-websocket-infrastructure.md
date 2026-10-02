# Phase 05 — Sprint 01: WebSocket Infrastructure (Socket.IO + Redis Pub/Sub)

## Sprint Objective

Set up the Socket.IO server with Redis adapter for horizontally scalable real-time event broadcasting.

## Dependencies

Phase 04 complete (ingestion pipeline emits Redis events).

## Scope

### Granular Implementation Tasks

1. Install and configure Socket.IO server in apps/api.
2. Configure @socket.io/redis-adapter for horizontal scaling.
3. Define Socket.IO room structure (project:{projectId}, run:{runId}).
4. Implement authentication middleware for WebSocket connections (JWT verification).
5. Create event emitter service that publishes to Redis on ingestion.
6. Create Socket.IO event handlers that broadcast Redis messages to rooms.
7. Define TypeScript types for all WebSocket events (run:started, run:result, run:completed).
8. Implement connection logging and monitoring.

## Expected Files / Areas

`apps/api/src/websocket/`, `packages/shared/src/events/`

## Testing & Verification

Integration tests for WebSocket connections, room joining, and event broadcasting. Load test for concurrent connections.

## Acceptance Criteria

- [ ] Socket.IO server accepts authenticated connections.
- [ ] Clients join project-specific rooms.
- [ ] Ingestion events are broadcast to connected clients.
- [ ] Redis adapter enables multi-server broadcasting.
- [ ] Connection authentication rejects invalid tokens.
- [ ] Event types are fully typed.

## Risks / Guardrails

WebSocket server blocking the API event loop; missing auth on WebSocket connections; Redis adapter misconfiguration.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05, Sprint 01: WebSocket Infrastructure (Socket.IO + Redis Pub/Sub).

OBJECTIVE:
Set up the Socket.IO server with Redis adapter for horizontally scalable real-time event broadcasting.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Install and configure Socket.IO server in apps/api.
2. Configure @socket.io/redis-adapter for horizontal scaling.
3. Define Socket.IO room structure (project:{projectId}, run:{runId}).
4. Implement authentication middleware for WebSocket connections (JWT verification).
5. Create event emitter service that publishes to Redis on ingestion.
6. Create Socket.IO event handlers that broadcast Redis messages to rooms.
7. Define TypeScript types for all WebSocket events (run:started, run:result, run:completed).
8. Implement connection logging and monitoring.

TEST:
Integration tests for WebSocket connections, room joining, and event broadcasting. Load test for concurrent connections.

ACCEPTANCE:
- [ ] Socket.IO server accepts authenticated connections.
- [ ] Clients join project-specific rooms.
- [ ] Ingestion events are broadcast to connected clients.
- [ ] Redis adapter enables multi-server broadcasting.
- [ ] Connection authentication rejects invalid tokens.
- [ ] Event types are fully typed.

GUARDRAILS:
WebSocket server blocking the API event loop; missing auth on WebSocket connections; Redis adapter misconfiguration.

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
