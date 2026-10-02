# Phase 01 — Sprint 03: System Architecture and Module Boundaries

## Sprint Objective

Design the complete system architecture: monorepo structure, service boundaries, data flow, and API contracts.

## Dependencies

P01-S01 product requirements, P01-S02 information architecture.

## Personas

- **Lead:** `role-fullstack-architect`
- **Reviewers / sign-off:** `role-backend-engineer`, `role-realtime-engineer`, `role-devops-engineer`, `role-security-engineer`

## Scope

### Granular Implementation Tasks

1. Document the package topology and boundary rules for all six workspaces (apps/web, apps/api, packages/shared, packages/db, packages/ui, packages/reporter), aligned with master plan §3.
2. Document the process topology (web on Vercel, api server with REST + Socket.IO gateway, worker with BullMQ, Neon, Redis) with scaling notes and failure modes (Redis down, DB failover, gateway restart).
3. Specify the ingestion protocol in full (master plan §4.2): request/response schemas, field limits, idempotency, shards, quotas, the stale-run reaper, and error codes.
4. Specify REST API conventions and the route map: nesting, response envelope, cursor pagination, and shared error codes.
5. Specify the real-time contract (master plan §4.3, §6): envelope, events, rooms, join/leave acks, and catch-up strategy.
6. Produce the ER diagram for all master plan §5 entities, with indexes and cascade rules.
7. Produce data-flow diagrams: ingestion, real-time fan-out, domain events → notifications/webhooks, retention, and aggregation.
8. Define the environment strategy (local, test, preview, staging, production), same-site domain layout, and a draft environment-variable catalog.
9. Write ADR-001 (monorepo tooling), ADR-002 (real-time engine and fan-out), ADR-003 (hosting and Redis provider, closes Q3), ADR-004 (dependency majors and runtime, closes Q2), and ADR-007 (ingestion protocol and fingerprints, closes Q6). Record the email provider decision (Q5).

## Expected Files / Areas

`docs/architecture/overview.md`, `docs/architecture/adr-001-*.md` … `adr-004-*.md`, `docs/architecture/adr-007-*.md`, `docs/api/ingestion.md`, `docs/api/rest-api.md`, `docs/api/realtime-events.md`, `docs/database/schema.md`, `docs/ops/environment.md`

## Testing & Verification

Review the architecture for scalability bottlenecks, single points of failure, and over-engineering. Trace one 10,000-test sharded run through every diagram end to end.

## Acceptance Criteria

- [ ] Module boundaries are defined, including how the reporter consumes shared code.
- [ ] The ingestion, REST, and real-time contracts are documented and match the master plan.
- [ ] The ER diagram covers all master plan §5 entities.
- [ ] Data flow diagrams are complete.
- [ ] ADR-001 through ADR-004 and ADR-007 are accepted; Q2, Q3, Q5, and Q6 are closed in master plan §11.

## Risks / Guardrails

Over-engineering for scale before validation; choosing trendy tech over reliable tech; starting on an already superseded framework major.

## Antigravity Execution Prompt

```text
You are the documentation/design agent for TestPulse, Phase 01 — Sprint 03: System Architecture and Module Boundaries.
Act as: role-fullstack-architect (load .agents/skills/role-fullstack-architect/SKILL.md). Reviewers: role-backend-engineer, role-realtime-engineer, role-devops-engineer, role-security-engineer.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts (§4–§8), Decision Log (§11), Open Decisions (§12)
3. planning/phases/01-phase-product-architecture-foundation.md
4. planning/sprints/P01-S03-system-architecture-and-module-boundaries.md — its Scope, Expected Files, Acceptance Criteria and Risks are the contract for this session.

BEFORE WRITING:
1. Confirm the sprint's dependencies are [x] in task.md; if not, stop and report.
2. Produce a short plan listing each deliverable and its path (paths must follow doc-implementation-standards).

EXECUTE every task under "Granular Implementation Tasks". Where a task resolves an item in master plan §12, record the decision as an ADR (or PRD section) and update master plan §11/§12 in the same change. Do not contradict the master plan silently — either align with it or propose an amendment explicitly.

AT COMPLETION:
- List the documents created/changed and how each acceptance criterion is satisfied.
- List any new open questions with the sprint that must close them.
- Update task.md.
```

## Sprint Definition of Done

- [ ] Every deliverable exists at the path listed in Expected Files / Areas.
- [ ] Content is consistent with the master plan; any change to a canonical contract is reflected in the master plan (§11 Decision Log / §12 Open Decisions).
- [ ] Open questions are listed with an owner sprint.
- [ ] Reviewer personas have reviewed the deliverables against the acceptance criteria.
- [ ] `task.md` updated.
