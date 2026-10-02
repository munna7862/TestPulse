# Phase 01 — Product & Architecture Foundation

← [Master Plan](../master/TestPulse_Master_Plan.md) | [Phase 02 →](./02-phase-project-bootstrap-devops.md)

## Objective

Define what TestPulse is, who it serves, and how it will be built — before writing a single line of implementation code.

## Outcome

A comprehensive, implementation-ready product specification and architecture blueprint that any engineer (human or AI agent) can pick up and execute against. All open decisions in master plan §12 are closed.

## Scope

- Product requirements document (PRD) with user personas and journey maps
- UX wireframes and information architecture
- System architecture document with module boundaries, data flows, and ADRs
- Security model, RBAC matrix, threat model, and tenant isolation strategy
- Testing strategy and quality gates
- Review and update of the agent operating contract (AGENTS.md and `.agents/skills/`)

This phase produces **documentation only**. Code quality gates (`npm run lint`, etc.) start in Phase 02.

## Architecture

```text
Product Requirements
        |
        v
UX Journeys & Wireframes
        |
        v
System Architecture & Module Boundaries (ADR-001..004, 007)
        |
        v
Security & Permissions Model (ADR-005, 006)
        |
        v
Testing Strategy & Agent Contract
```

## Key Decisions

Already resolved in the planning review (master plan §11 — record each as an ADR in this phase):

1. Monorepo: npm workspaces + Turborepo 2 (D-10) → ADR-001
2. Real-time: Socket.IO with redis-adapter + redis-emitter (D-03) → ADR-002
3. Auth: API-owned auth with cookie sessions, no Auth.js/Clerk (D-01) → ADR-005
4. Tenant isolation: tenant-scoped client, nested routes, 404 policy (D-04) → ADR-006
5. Ingestion: incremental batches with shard support (D-02) → ADR-007
6. Deployment: the free-tier profile until feature-complete (D-14: Vercel Hobby + Render free + Neon free + Render Key Value); paid profile decided in P10-S06 → ADR-003

Still open and owned by this phase (master plan §12):

- Q1 Quarantine CI semantics (P01-S01)
- Q2 Exact dependency majors (P01-S03, ADR-004)
- Q4 PostgreSQL RLS as defense in depth (P01-S04)
- Q5 Email provider (P01-S03)
- Q6 Test identity on rename/move (P01-S03)

## Testing

Review all specification documents for:
- Ambiguity and conflicting requirements
- Contradictions with the master plan (fix the master plan or the document — never leave both)
- Missing acceptance criteria
- Security gaps
- Scalability bottlenecks

## Acceptance Criteria

- [ ] Product requirements are unambiguous and implementation-ready.
- [ ] User personas and journeys are documented.
- [ ] System architecture diagram covers all major components, including the worker process.
- [ ] Data model covers all master plan §5 entities.
- [ ] Security model ensures tenant isolation and defines the auth design.
- [ ] Testing strategy is defined with coverage targets and Docker-free infrastructure.
- [ ] AGENTS.md and skills are consistent with the Phase 01 decisions.
- [ ] Master plan §12 has no open items left for Phase 01.

## Exit Criteria

Every engineer on the team (human or agent) can answer: "What are we building, for whom, with what technology, and how do we know it works?"

## Sprint Decomposition

- P01-S01: Product requirements baseline
- P01-S02: UX journeys and information architecture
- P01-S03: System architecture and module boundaries
- P01-S04: Security and permissions model
- P01-S05: Testing strategy and agent operating contract
