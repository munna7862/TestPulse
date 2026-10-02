# ADR-002: Real-Time Engine — Socket.IO with Redis Emitter/Adapter and Ticket Auth

## Status
Accepted (P01-S03, 2026-10)

## Context
TestPulse streams results to many viewers while CI runs, syncs annotations and quarantine changes, and delivers per-user notifications. Producers include HTTP handlers and background workers. The API must scale horizontally in production, and runs as a single sleeping instance on the free tier. In the free profile the gateway is on a different site from the web app (`*.onrender.com` vs `*.vercel.app`), so cookies can't authenticate the WebSocket.

## Decision
1. **Socket.IO v4** gateway inside `apps/api` (`server.ts`).
2. **Fan-out:** producers emit through `RealtimePublisher`, a wrapper around **`@socket.io/redis-emitter`** that Zod-validates the payload and stamps `eventId`, `version`, and `occurredAt`. Gateways use **`@socket.io/redis-adapter`**, so each instance delivers only to its local sockets. Hand-rolled "subscribe and `io.to().emit()`" relays are forbidden (they deliver every event N times).
3. **Rooms:** `project:{projectId}` (join via ack-based `join:project` with a membership check) and `user:{userId}` (joined automatically). There are no per-run rooms in v1.
4. **Auth:** a cookie-authenticated `POST /api/v1/realtime/ticket` returns a 60-second, single-use ticket stored in Redis. The client connects with `auth: { ticket }`, and the gateway redeems it atomically (`GETDEL`). Every reconnect needs a new ticket.
5. **Transport:** `["websocket"]` in the free profile (single instance). For multiple paid instances, either websocket-only or sticky sessions (decided in P10-S06).
6. **Catch-up:** no server-side event log. On reconnect, clients re-join and refetch through REST. Events carry absolute counters and IDs, so replays are harmless.
7. **Lean payloads:** one `run:progress` per ingested batch (up to 1,000 lean items); details are fetched on demand.

## Consequences
- **Positive:** horizontal scale without duplicates; workers can emit without a Socket.IO server; works cross-site in the free profile; simple reconnection semantics.
- **Negative / trade-offs:** Socket.IO connection-state recovery is unavailable with this adapter; refetch on reconnect costs extra REST calls; ticket issuance adds one round trip per connection.
- **Mitigation:** jittered reconnects to avoid refetch storms; React Query de-duplicates refetches; tickets are cheap Redis operations.

## Alternatives considered
- **Server-Sent Events + Redis pub/sub:** simpler, but lacks bidirectional room joins and still needs a fan-out design.
- **Native `ws`:** less overhead, but rooms, reconnection, and adapters would have to be rebuilt.
- **Managed real-time services (Pusher, Ably):** fast to adopt, but cost money (conflicts with D-14) and add a vendor for core functionality.
- **Cookie auth on the socket:** fails cross-site in the free profile; tickets work in both profiles.
