# Phase 02 — Sprint 02: Next.js Frontend and Fastify Backend Scaffolding

## Sprint Objective

Scaffold the Next.js 15 frontend application and Fastify backend API server within the monorepo.

## Dependencies

P02-S01 monorepo initialized.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-fullstack-architect`

## Scope

### Granular Implementation Tasks

1. Scaffold Next.js (major per ADR-004) with the App Router in apps/web: TypeScript strict, Tailwind CSS v4.
2. Scaffold Fastify 5 in apps/api with `fastify-type-provider-zod`, `@fastify/sensible`, a central error handler that produces the shared response envelope, a pino logger with secret redaction, and `GET /health`.
3. Create the apps/api entrypoints `src/server.ts` (HTTP) and `src/worker.ts` (exports `startWorkers()`). `server.ts` also starts the workers when `RUN_WORKERS_IN_PROCESS=true` (free profile, master plan §4.4). Both have graceful shutdown on SIGTERM.
4. Create `tsconfig.base.json` (strict, noUncheckedIndexedAccess, noImplicitOverride) and have every workspace extend it.
5. Seed `@testpulse/shared` with the response envelope schema, error-code enum, and env-schema helpers (browser-safe only).
6. Add Zod-validated environment loading for web, api, and worker, plus `.env.example` files.
7. Make `npm run dev` start web, api, and worker with hot reload (e.g. `tsx watch`) on Windows and POSIX.
8. Create a typed API client skeleton in apps/web that calls the same-origin `/api` path (`credentials: "include"`, Zod response parsing). Configure a Next.js rewrite `/api/:path*` → `API_INTERNAL_URL`, so the free profile has first-party cookies.

## Expected Files / Areas

`apps/web/`, `apps/api/src/server.ts`, `apps/api/src/worker.ts`, `packages/shared/src/`, `tsconfig.base.json`

## Testing & Verification

Start all dev processes and verify `/health` responds and hot reload works. Unit-test the error handler envelope and env validation (a missing variable fails fast with a readable message).

## Acceptance Criteria

- [ ] The Next.js dev server starts without errors.
- [ ] The Fastify API responds to the health check with the standard envelope.
- [ ] The worker process starts and shuts down gracefully.
- [ ] TypeScript strict mode is enabled in every workspace.
- [ ] Invalid or missing environment variables fail fast at startup.

## Risks / Guardrails

Version conflicts between Next.js and Fastify dependencies; incorrect TypeScript config inheritance; Node-only code leaking into `@testpulse/shared`.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02 — Sprint 02: Next.js Frontend and Fastify Backend Scaffolding.
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-fullstack-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/02-phase-project-bootstrap-devops.md
4. planning/sprints/P02-S02-frontend-backend-scaffolding.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P02_S02.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P02-S02.md and update task.md.
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
