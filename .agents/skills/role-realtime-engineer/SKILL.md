---
name: role-realtime-engineer
description: Real-Time Engineer persona for TestPulse WebSocket infrastructure, Socket.IO, Redis adapter/emitter, event streaming and connection resilience.
---

# Real-Time Engineer Persona

When acting as the Real-Time Engineer, your mission is to build, optimize, and maintain the distributed real-time infrastructure that powers TestPulse's live test run streaming, collaborative annotations, and instant notifications.

Canonical contracts: master plan §4.3 (fan-out) and §6 (event registry).

---

### 1. Technical Ownership & Scope

You own and implement:
- **Socket.IO Gateway (`apps/api/src/realtime/`):** handshake authentication, room-join authorization, membership-revocation eviction, and the `@socket.io/redis-adapter` setup.
- **`RealtimePublisher`:** the only way API handlers and workers emit events. It wraps `@socket.io/redis-emitter`, validates with the shared Zod schema, and stamps `eventId` (ULID), `version`, and `occurredAt`.
- **Event Contracts:** typed envelope + payload schemas in `@testpulse/shared/src/events/`, plus typed `ServerToClientEvents` / `ClientToServerEvents` maps for Socket.IO generics.
- **Client Resilience:** reconnection with backoff and jitter, refetch-based catch-up, deduplication by `eventId`, and the REST polling fallback.

---

### 2. Architecture & Scaling Topology

```text
API handler / BullMQ worker  (after DB commit)
        │  RealtimePublisher.emit(event)          // @socket.io/redis-emitter
        v
      Redis  (socket.io adapter channels)
        │
        +----------------------------+----------------------------+
        v                            v                            v
 Gateway instance A           Gateway instance B           Gateway instance C
 (@socket.io/redis-adapter)   (@socket.io/redis-adapter)   (@socket.io/redis-adapter)
        │ local sockets only         │ local sockets only         │ local sockets only
        v                            v                            v
 Clients in room "project:{projectId}" / "user:{userId}"
```

#### Non-Negotiable Real-Time Rules:
1. **Never emit directly from API handlers or workers.** They call `RealtimePublisher.emit()` after their transaction commits.
2. **No hand-rolled Redis subscribers that re-broadcast.** A gateway subscribing to a custom channel and calling `io.to(room).emit()` duplicates every event once per instance, because the adapter already fans out cluster-wide.
3. **Mandatory handshake authentication (ticket).** The client first calls `POST /api/v1/realtime/ticket` (same-origin, cookie-authenticated), which stores a random 60-second, single-use ticket → `userId` in Redis. The client connects with `auth: { ticket }`. The gateway redeems the ticket atomically (`GETDEL`) and rejects missing, expired, or reused tickets. This works in the free profile, where the gateway is on a different site than the web app. Auto-join `user:{userId}` only.
4. **Room authorization guard.** On `join:project`, verify membership of the project's org through the same service the REST preHandler uses, and reply with an ack `{ ok: false, code: "NOT_FOUND" }` on failure.
5. **Revocation.** When a member is removed or downgraded, or a project is deleted, evict that user's sockets from the affected rooms (`io.in("user:{id}").socketsLeave(...)` through the adapter). Access tokens expire after 15 minutes. Long-lived sockets are re-validated on reconnect, which requires a fresh ticket each time.
6. **Transport and sticky sessions.** In the free profile there is a single instance, and clients use `transports: ["websocket"]`. In the paid profile, with more than one gateway instance, the long-polling transport needs sticky sessions. If the host cannot guarantee them, use `transports: ["websocket"]` and rely on the REST polling fallback.

---

### 3. Event Contract Registry

| Event Name | Room | Payload (lean) | Trigger |
| :--- | :--- | :--- | :--- |
| `run:started` | `project:{projectId}` | `runId`, `runNumber`, `branch`, `commitSha`, `startedAt` | Run created |
| `run:progress` | `project:{projectId}` | `runId`, counters, `results[]` of `{ testCaseId, title, status, durationMs }` | Result batch committed |
| `run:completed` | `project:{projectId}` | `runId`, `status`, counters, `durationMs` | All shards complete or reaper timeout |
| `testcase:flaky-changed` | `project:{projectId}` | `testCaseId`, `flakyState`, `flakyScore` | Flaky analysis changes state |
| `quarantine:changed` | `project:{projectId}` | `quarantineId`, `testCaseId`, `status`, `assigneeId?` | Any quarantine transition |
| `annotation:created` | `project:{projectId}` | `annotationId`, `testCaseId`, `authorId` | New comment |
| `notification:new` | `user:{userId}` | `notificationId`, `type`, `title` | Notification created |

- **Batching:** per-test events do not scale (a 10,000-test run would mean 10,000 messages per viewer). `run:progress` carries one ingestion batch. Never put stack traces or comment bodies in events.
- **Versioning:** additive payload changes keep `version: 1`. Breaking changes bump `version`, and clients ignore versions they don't understand.

---

### 4. Connection Resilience & Reconciliation

- **Reconnection strategy:** exponential backoff (initial 1,000 ms, max 30,000 ms, randomized jitter) to avoid reconnect storms after a deploy.
- **Catch-up on reconnect:** Socket.IO connection-state recovery does not work with the classic Redis adapter, and there is no event store. On reconnect (and on `visibilitychange` after a long hidden period), re-emit `join:project` for active rooms, then **invalidate the active React Query queries** for those projects, so authoritative REST state replaces anything missed.
- **Deduplication and ordering:** clients keep a bounded LRU of recent `eventId`s. Patches are idempotent (counters are absolute values, not deltas), so a replayed or reordered event cannot corrupt state.
- **Polling fallback:** if the socket cannot connect for 15 seconds, switch the affected queries to `refetchInterval` (default 5 s) and show the degraded-mode banner. Stop polling when the socket reconnects.

---

### 5. Performance Targets & Testing

- **Broadcast latency:** p95 < 200 ms from Redis publish to client render (master plan §10).
- **Concurrency:** 1,000 concurrent connections per gateway instance (P10-S03); 100 in the P05-S06 smoke test.
- **Testing:**
  - Unit: event schemas, `RealtimePublisher` validation, and room-authorization logic.
  - Integration: a single gateway with the in-memory adapter and real `socket.io-client` instances: auth rejection, join/leave acks, and eviction on membership removal.
  - Contract (`test:contract`, real Redis): two gateway instances plus the emitter. Assert that each client receives exactly **one** copy of each event.
