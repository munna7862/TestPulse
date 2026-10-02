# Phase 05 — Sprint 02: Socket.IO Client Integration and Connection Management

## Sprint Objective

Implement the React-side Socket.IO client with connection lifecycle management, auto-reconnect, and state synchronization.

## Dependencies

P05-S01 WebSocket infrastructure.

## Personas

- **Lead:** `role-frontend-engineer`, `role-realtime-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Install socket.io-client in apps/web and create a `SocketProvider` that, after login, fetches a ticket from `/api/v1/realtime/ticket` and opens one websocket connection per tab to `NEXT_PUBLIC_SOCKET_URL` with `auth: { ticket }`. Every reconnect fetches a fresh ticket.
2. Model connection state (connecting / live / reconnecting / offline) in a small state machine exposed by `useSocket`.
3. Reconnect with exponential backoff and jitter (1 s → 30 s).
4. Connection status indicator in the app-shell slot from P02-S06.
5. Room subscription management: join and leave project rooms on navigation, and re-join after reconnect.
6. Typed `useSocketEvent` hooks that Zod-parse payloads and deduplicate by `eventId`.
7. On an auth `connect_error` (expired or reused ticket), refresh the session through the API client if needed, fetch a new ticket, and reconnect. If refresh fails, redirect to login. While the free-tier API is cold-starting, show "connecting…" rather than "offline".

## Expected Files / Areas

`apps/web/src/providers/SocketProvider.tsx`, `apps/web/src/hooks/useSocket.ts`, `apps/web/src/hooks/useSocketEvent.ts`, `apps/web/src/components/ConnectionStatus.tsx`

## Testing & Verification

Unit tests for the connection state machine and dedup. Component tests with a fake socket. E2E tests for connect, server restart → reconnect, and token expiry → silent refresh.

## Acceptance Criteria

- [ ] The client connects using single-use tickets; no long-lived token is exposed to JavaScript.
- [ ] The connection status indicator reflects the current state.
- [ ] Auto-reconnect works after network disruption and a server restart.
- [ ] Room subscriptions follow navigation between projects.
- [ ] Event listeners are cleaned up on unmount (no duplicate handlers).
- [ ] An expired session or ticket leads to a silent refresh and reconnect.

## Risks / Guardrails

Memory leaks from uncleared listeners; reconnect storms after deploys; multiple sockets per tab; stale session on long-lived connections.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05 — Sprint 02: Socket.IO Client Integration and Connection Management.
Act as: role-frontend-engineer + role-realtime-engineer (load .agents/skills/role-frontend-engineer/SKILL.md, .agents/skills/role-realtime-engineer/SKILL.md). Reviewers: role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/05-phase-real-time-dashboard.md
4. planning/sprints/P05-S02-socketio-client-integration.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P05_S02.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P05-S02.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] New or changed screens have loading, empty and error states and pass the axe-core check in light and dark themes.
- [ ] Acceptance criteria verified.
- [ ] Feature catalog status and scenario catalog "Automated by" entries updated; tests carry `[SC-*]` IDs in their titles.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
