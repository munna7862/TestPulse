# Real-Time Event Dictionary (Socket.IO)

> **Sprint:** P01-S03 (design) → P04-S02 (publisher), P05-S01 (gateway), P05-S02 (client). Architecture: [ADR-002](../architecture/adr-002-realtime-engine.md). Canonical summary: master plan §6.

## 1. Connection

1. The client calls `POST /api/v1/realtime/ticket` (same origin, cookie session) → `{ ticket, expiresAt }`. The ticket is single-use and valid for 60 s.
2. `io(NEXT_PUBLIC_SOCKET_URL, { transports: ["websocket"], auth: { ticket } })`.
3. The gateway redeems the ticket (`GETDEL tp:ticket:<t>` → `userId`) and joins `user:{userId}`. Failure → `connect_error` with `data.code` = `TICKET_INVALID`.
4. Every reconnect obtains a **new** ticket (in the client's `reconnect_attempt` hook).

## 2. Client → server

| Event | Payload | Ack |
| :--- | :--- | :--- |
| `join:project` | `{ projectId }` | `{ ok: true }` or `{ ok: false, code: "NOT_FOUND" }` (non-member or unknown project, deliberately indistinguishable) |
| `leave:project` | `{ projectId }` | `{ ok: true }` |

The client re-sends `join:project` for every active project after each (re)connect.

## 3. Server → client

**Envelope (all events):**

```ts
RealtimeEnvelope<T> = {
  eventId: string       // ULID; clients dedupe with a bounded LRU
  type: string          // equals the Socket.IO event name
  version: 1
  occurredAt: string    // ISO-8601 UTC (time of the DB commit)
  orgId: string
  projectId?: string
  payload: T
}
```

| Event | Room | Payload | Producer | Client action |
| :--- | :--- | :--- | :--- | :--- |
| `run:started` | `project:{id}` | `{ runId, runNumber, branch, commitSha, startedAt, shardTotal, expectedTestCount? }` | Ingest start (create only) | Prepend to the run list; show in "Running now" |
| `run:progress` | `project:{id}` | `{ runId, counters: RunCounters, expectedTestCount?, results: Array<{ testCaseId, title, status, durationMs, quarantined: boolean }> (≤ 1,000) }` | Each committed batch | Patch the run detail (upsert by `testCaseId`); replace counters (absolute values) |
| `run:completed` | `project:{id}` | `{ runId, status, counters, durationMs, quarantineUnblocked?: boolean }` | All shards done / reaper | Finalize the views; invalidate analytics queries |
| `testcase:flaky-changed` | `project:{id}` | `{ testCaseId, flakyState, flakyScore }` | Flaky analysis (state change only) | Update badges; invalidate the flaky list |
| `quarantine:changed` | `project:{id}` | `{ quarantineId, testCaseId, status, assigneeId?, markers: { warnedAt?, escalatedAt?, overdueFlaggedAt? } }` | Quarantine API, SLA job | Patch the quarantine row and test detail |
| `annotation:created` | `project:{id}` | `{ annotationId, testCaseId, authorId }` | Annotation API | Refetch the feed if that test is open |
| `notification:new` | `user:{id}` | `{ notificationId, type, title, linkPath }` | Notification router | Increment the badge; prepend to the popover |

Rules:
- Never include stack traces, comment bodies, emails, or secrets in events.
- Events are emitted **after** the DB commit. Treat them as hints: if anything seems inconsistent, refetch.
- Additive payload changes keep `version: 1`. Breaking changes bump `version`, and clients ignore unknown versions.
- Throughput guard: one `run:progress` per ingested batch per run. Clients coalesce cache writes per animation frame.

## 4. Membership changes

When a member is removed or downgraded, or a project is deleted, the API publishes an internal event. The gateway then makes that user's sockets leave the affected `project:*` rooms (`socketsLeave` via the adapter). The client receives `access:revoked { projectId? }` and navigates away. `access:revoked` is the only control event outside the registry above.
