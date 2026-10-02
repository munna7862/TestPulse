# Phase 05 — Sprint 06: Connection Resilience, Polling Fallback, and Performance Testing

## Sprint Objective

Harden the real-time system: add polling fallback, test connection resilience, and verify performance under load.

## Dependencies

P05-S05 test case detail view.

## Personas

- **Lead:** `role-realtime-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. REST polling fallback: after 15 s without a socket connection, switch active queries to `refetchInterval` (5 s) and show the degraded-mode banner. Stop when the socket reconnects.
2. Catch-up on reconnect: re-join rooms and invalidate active queries. There is no missed-events endpoint, because the server keeps no event log.
3. Event deduplication by `eventId` (bounded LRU) and absolute-value patches, so replays are harmless.
4. Health monitoring: tune Socket.IO ping interval/timeout and track connection age and reconnect counts.
5. Smoke performance test: 100 concurrent sockets receiving `run:progress`, with p95 latency under 200 ms (master plan §10).
6. Throughput test: 2,000 results/second ingestion with 50 connected clients.
7. Resilience tests: restart a gateway instance and restart Redis; clients recover without a page reload and show correct state.

## Expected Files / Areas

`apps/web/src/hooks/useSocket.ts`, `apps/web/src/providers/SocketProvider.tsx`, `tests/performance/`

## Testing & Verification

Resilience tests (kill a server, restart Redis, verify recovery and correct counters). Load tests for concurrent connections and event throughput, with results recorded in `docs/testing/performance-baselines.md`.

## Acceptance Criteria

- [ ] The polling fallback activates when the socket is unavailable and shows a degraded-mode banner.
- [ ] After reconnecting, the UI shows authoritative state with no missing or duplicate results.
- [ ] 100 concurrent connections stay within the latency target.
- [ ] 2,000 results/second with 50 clients works without UI or server degradation.
- [ ] Gateway and Redis restarts recover automatically.

## Risks / Guardrails

Polling interval too aggressive (server load); refetch storms when many clients reconnect at once (add jitter); test results not representative of production topology.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05 — Sprint 06: Connection Resilience, Polling Fallback, and Performance Testing.
Act as: role-realtime-engineer + role-frontend-engineer (load .agents/skills/role-realtime-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/05-phase-real-time-dashboard.md
4. planning/sprints/P05-S06-connection-resilience-performance.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P05_S06.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P05-S06.md and update task.md.
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
