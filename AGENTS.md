# TestPulse — Agent Knowledge & Engineering Guidelines

This document is the **always-on memory and operational baseline** for all AI models, agent personas, and human engineers working on the `TestPulse` monorepo. It codifies the architecture, boundaries, environment constraints, and non-negotiable rules to maintain high quality and velocity.

---

## 🧭 Repository Overview & Tech Stacks

`TestPulse` is a multi-tenant SaaS application for real-time test execution monitoring, collaborative flaky test triage, and automated quarantine lifecycle management.

### Source of Truth

[`planning/master/TestPulse_Master_Plan.md`](planning/master/TestPulse_Master_Plan.md) is the canonical contract for the **ingestion API (§4.2)**, **real-time fan-out and events (§4.3, §6)**, **domain model (§5)**, **RBAC and isolation rules (§7)**, **plan limits (§8)**, and **non-functional targets (§10)**. If a phase or sprint file disagrees with it, the master plan wins: fix the stale file in the same PR. Never silently pick one side of a conflict. Changing a canonical contract requires an ADR plus a master-plan update in the same PR.

### Monorepo Topology
```text
testpulse/
├── apps/
│   ├── web/               # Next.js 16 (App Router, React 19, Tailwind CSS v4, Radix UI) — app, marketing, docs
│   └── api/               # Fastify 5: src/server.ts (REST + Socket.IO gateway), src/worker.ts (BullMQ workers)
├── packages/
│   ├── shared/            # Isomorphic: Zod schemas, inferred types, event contracts, plan limits, pure utils
│   ├── db/                # Prisma schema, migrations, tenant-scoped client (createTenantDb / systemDb)
│   ├── ui/                # Shared design system primitive components (Radix + Tailwind)
│   └── reporter/          # Published CI reporter npm package (Playwright + Vitest in v1)
├── planning/              # Master plan, phase blueprints, sprint decomposition files
├── docs/                  # Product, architecture, API, database, testing, security, ops docs
├── .agents/skills/        # Codified virtual persona skills and development standards
└── task.md                # Centralized sprint and task execution tracking board
```

### Technology Stacks
*   **Runtime**: Node.js 24 LTS everywhere (`.nvmrc`, CI, hosting). npm workspaces + Turborepo 2.
*   **Hosting**: the **free-tier profile** (Vercel Hobby + Render free + Neon free + Render Key Value) is used until the product is feature-complete. The paid setup is decided in P10-S06 (master plan §4.4, D-14). Code must work in both profiles through configuration only: same-origin `/api` proxy, ticket-based socket auth, `RUN_WORKERS_IN_PROCESS`, and catch-up-safe scheduled jobs.
*   **Frontend (`apps/web`)**: Next.js 16 (App Router; `proxy.ts` replaces `middleware.ts`), React 19, TanStack React Query v5, Zustand, Tailwind CSS v4, Radix UI primitives, Lucide React, Recharts.
*   **Backend (`apps/api`)**: Fastify 5, `fastify-type-provider-zod`, `@fastify/jwt`, `@fastify/cookie`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, Socket.IO v4, BullMQ v5, pino.
*   **Database (`packages/db`)**: Prisma ORM, PostgreSQL 16 on Neon (pooled `DATABASE_URL` at runtime, `DIRECT_URL` for migrations).
*   **Shared (`packages/shared`)**: Typed events, Zod schemas, domain models, plan limits. **Browser-safe only:** no `ioredis`, Prisma, or Node built-ins. The Redis client lives in `apps/api/src/lib/redis.ts`.
*   **Real-time Infrastructure**: `@socket.io/redis-emitter` (API handlers and workers publish) → Redis → `@socket.io/redis-adapter` (each gateway instance delivers to its local sockets).
*   **Testing Toolchain**: Vitest (unit/integration), Supertest (API), Playwright (E2E), MSW (component network mocking), `ioredis-mock` (unit tests only), `@axe-core/playwright`, k6.

> Exact dependency majors are pinned by [ADR-004](docs/architecture/adr-004-dependency-baseline.md): Node 24, TypeScript **6.0** (not 7 until typescript-eslint supports it), Next.js 16, Fastify 5, Zod 4, **Prisma 7.10** (never `prisma@latest` while it points at an RC), BullMQ 6 with **ioredis 5** (for `ioredis-mock`), Vitest 5, ESLint 10. Fastify 4 and Node 20 are end-of-life and must not be used. Upgrading a major requires an ADR-004 amendment.

> **Phase 01 reference docs:** [PRD](docs/product/prd.md) · [glossary](docs/product/glossary.md) · [IA & wireframes](docs/ux/information-architecture.md) · [architecture overview & ADRs](docs/architecture/overview.md) · [API contracts](docs/api/rest-api.md) · [schema](docs/database/schema.md) · [security model](docs/security/security-model.md) · [testing strategy](docs/testing/testing-strategy.md) · [environment](docs/ops/environment.md).

---

## ⚡ Core Rules & Non-Negotiables (Must Follow)

### 1. Tenant Isolation (Critical Security Mandate)
*   **Rule**: Every query against a tenant-owned table is scoped by `projectId` and/or `orgId`. The only global tables are `User`, `OAuthAccount`, `Session`, and `VerificationToken`.
*   **Enforcement**: Application code uses `createTenantDb(tenantContext)` from `@testpulse/db`. The unscoped `systemDb` is reserved for auth tables, migrations, and background jobs that then open a tenant-scoped client from the job's Zod-validated `orgId`/`projectId`. Importing `@prisma/client` outside `packages/db` is a lint error.
*   **Routes**: User-facing resources are nested under `/api/v1/orgs/:orgId/...` or `/api/v1/projects/:projectId/...`. Handlers read tenant IDs only from `request.tenantContext`, never from the body.
*   **Responses**: Cross-tenant access returns **404** (do not disclose existence). Insufficient role inside your own tenant returns **403**.
*   **Authorization**: Roles (`Owner`, `Admin`, `Member`, `Viewer`) are organization-level and apply to all projects in the org (matrix: master plan §7). API keys are project-scoped and may only call `/api/v1/ingest/*` for their own project.
*   Cross-tenant data leakage is a critical, release-blocking vulnerability.

### 2. Strict Typing & Schema Validation
*   **Rule**: Zero `any` types (including `as any` and `// @ts-ignore`). All `tsconfig.json` files extend a base with `"strict": true`, `"noUncheckedIndexedAccess": true`, and `"noImplicitOverride": true`.
*   **Boundaries**: All data crossing boundaries (API requests and responses, WebSocket payloads, BullMQ job data, environment variables, reporter payloads) MUST be validated with Zod schemas defined in `packages/shared`.
*   **Inference**: TypeScript types are derived from Zod schemas via `z.infer<typeof Schema>` to prevent type/schema drift. Fastify routes use `fastify-type-provider-zod` so the same schemas validate requests and generate OpenAPI.

### 3. Real-Time Architecture & Scaling
*   **Rule**: API route handlers and workers NEVER hold a Socket.IO server reference and never call `io.emit`.
*   **Pattern**: API handler → DB mutation **commits** → `RealtimePublisher.emit()` (Zod-validated, wraps `@socket.io/redis-emitter`) → Redis → `@socket.io/redis-adapter` on each gateway instance → authorized `project:{projectId}` / `user:{userId}` rooms.
*   **Forbidden**: gateway instances subscribing to a custom Redis channel and re-broadcasting with `io.to(room).emit()`. With the Redis adapter, this delivers every event N times (once per instance).
*   **Payloads**: WebSocket payloads are lean (entity IDs, status, counters) and use the shared envelope `{ eventId, type, version, occurredAt, orgId, projectId?, payload }`. Clients patch or refetch state.

### 4. Monorepo Package Boundaries
*   `packages/shared` cannot import from `apps/*`, `packages/db`, or `packages/ui`, and must stay browser-safe.
*   `packages/db` cannot import from `apps/*` or `packages/ui`.
*   `packages/ui` cannot import from `apps/*` or `packages/db`.
*   `apps/web` cannot import from `packages/db`. All web data access goes through `apps/api`.
*   `packages/reporter` bundles anything it uses from `@testpulse/shared` at build time. Its only runtime deps are test-runner peer deps.
*   Internal package imports use the `@testpulse/*` namespace. Boundaries are enforced by ESLint, not only by review.

### 5. Cross-Platform & Environment Compatibility
*   **Operating System**: The primary development environment is Windows PowerShell; CI runs on Linux.
*   **Tooling Rules**:
    *   Never use shell-specific syntax in npm scripts (`&&` chains that assume bash, `export FOO=bar`, `rm -rf`, `/bin/sh`). Use `cross-env`, `rimraf`, `npm-run-all2`/Turborepo, and Node scripts.
    *   Avoid hardcoded POSIX paths (`/tmp`, `/etc`). Use `path.join()`, `path.resolve()`, and `os.tmpdir()`.
    *   Normalize test file paths to POSIX separators before fingerprinting or storing them (Windows runners report `\`).
    *   Line endings are normalized by `.gitattributes` (`* text=auto eol=lf`). Files are UTF-8 **without** BOM.
*   **Docker-Free Local Development & Testing**:
    *   Do not assume a local Docker daemon is running on developer machines.
    *   PostgreSQL: use a native local install or a personal Neon branch. Tests isolate by **schema per Vitest worker**, not by transaction rollback.
    *   Redis: `ioredis-mock` is for unit tests only. BullMQ and Socket.IO-adapter behavior is covered by a `test:contract` suite that runs against real Redis (a GitHub Actions service container in CI; optional locally via `REDIS_URL`).
    *   CI runners may use GitHub Actions service containers. The "no Docker" rule applies to developer machines.

### 6. Security Hygiene
*   Never log secrets: configure pino `redact` for `authorization`, `cookie`, `set-cookie`, API keys, tokens, and passwords.
*   Treat CI-provided data (test titles, error messages, stack traces) and user comments as **untrusted**: render as text, cap sizes, and never inject them as HTML.
*   Store only hashes of API keys, refresh tokens, and invitation/reset/verification tokens. Webhook secrets are encrypted at rest because they are needed for signing.

### 7. Traceability (Features ↔ Tests)
*   Every feature has an `FR-*` ID in [`docs/product/feature-catalog.md`](docs/product/feature-catalog.md), and every test scenario has an `SC-*` ID in [`docs/testing/scenario-catalog.md`](docs/testing/scenario-catalog.md).
*   Sprint test catalogs (`docs/testing/test_cases_catalog_PXX_SYY.md`) reference existing `SC-*` IDs. New scenarios are added to the master scenario catalog in the same PR.
*   Automated tests put the scenario ID in the test title, e.g. `it("[SC-ING-004] retried batch is idempotent", ...)`, so coverage is greppable.
*   When a sprint completes, update the feature status and each scenario's "Automated by" column. PR descriptions list the FR and SC IDs they touch.

### 8. No Speculative Features
*   Adhere strictly to the active sprint plan. Do not build features that are explicitly deferred (master plan §1 "Non-MVP Exclusions"): Stripe billing, plan feature-gating, SSO/SAML, AI root-cause diagnosis, Slack bots, shareable public dashboards, reporters beyond Playwright/Vitest, or a server-side GitHub App.

---

## 🤖 Virtual Sprint Team & Agent Personas

The monorepo operates with 10 specialized virtual agent personas. Each sprint file lists its lead and reviewer personas under `## Personas`. Detailed instructions are in `.agents/skills/`:

| Persona | Skill Directory | Primary Responsibilities |
| :--- | :--- | :--- |
| **Scrum Master** | [`.agents/skills/role-scrum-master`](.agents/skills/role-scrum-master/SKILL.md) | Sprint orchestration, `task.md` tracking, dependency routing, phase gates |
| **Product Owner** | [`.agents/skills/role-product-owner`](.agents/skills/role-product-owner/SKILL.md) | Acceptance review, UX standards, plan-limit boundaries, release sign-off |
| **Fullstack Architect** | [`.agents/skills/role-fullstack-architect`](.agents/skills/role-fullstack-architect/SKILL.md) | System design, monorepo boundaries, API contracts, data models, ADRs |
| **Backend Engineer** | [`.agents/skills/role-backend-engineer`](.agents/skills/role-backend-engineer/SKILL.md) | Fastify API, Prisma migrations, BullMQ workers, ingestion pipeline, reporter |
| **Frontend Engineer** | [`.agents/skills/role-frontend-engineer`](.agents/skills/role-frontend-engineer/SKILL.md) | Next.js UI, React Query hooks, Zustand state, Tailwind v4, Radix components |
| **Real-Time Engineer** | [`.agents/skills/role-realtime-engineer`](.agents/skills/role-realtime-engineer/SKILL.md) | Socket.IO gateway, Redis adapter/emitter, room auth, connection resilience |
| **SDET Architect** | [`.agents/skills/role-sdet-architect`](.agents/skills/role-sdet-architect/SKILL.md) | Test pyramid, test cases catalog, anti-flakiness, coverage, CI quality gates |
| **Security Engineer** | [`.agents/skills/role-security-engineer`](.agents/skills/role-security-engineer/SKILL.md) | Tenant isolation audits, RBAC verification, credential handling, OWASP compliance |
| **DevOps Engineer** | [`.agents/skills/role-devops-engineer`](.agents/skills/role-devops-engineer/SKILL.md) | Turborepo CI/CD pipelines, free-tier then paid deploys, monitoring, environment configs |
| **Growth Engineer** | [`.agents/skills/role-growth-engineer`](.agents/skills/role-growth-engineer/SKILL.md) | Landing page, docs portal, SEO, privacy-first analytics, onboarding time-to-first-value |

### Additional Engineering Standards
*   [**`dev-coding-standards`**](.agents/skills/dev-coding-standards/SKILL.md): Production standards for TypeScript, Fastify, Next.js, Prisma, and Zod.
*   [**`doc-implementation-standards`**](.agents/skills/doc-implementation-standards/SKILL.md): Standards for ADRs, API contracts, test catalogs, and sprint walkthroughs.

---

## 📋 Task State Management Protocol (`task.md`)

A centralized `task.md` file at the root of the workspace tracks the lifecycle of every sprint and task.

### Progress Indicators:
*   `[ ]` **Pending / Backlog:** Not yet started; waiting for phase prerequisites or prior tasks to complete.
*   `[/]` **In Progress:** Actively being executed by the assigned agent persona.
*   `[x]` **Completed & Verified:** Fully implemented, tests passing, reviewed against quality gates, and signed off.
*   `[!]` **Blocked:** Waiting on a decision or external dependency; the blocker is written next to the item.

### Sprint Lifecycle Steps:
1.  **Kick-off (`role-scrum-master`)**: Create branch `feat/PXX-SYY-<description>` (`docs/PXX-SYY-<description>` for documentation-only sprints), expand sprint tasks in `task.md`, verify prerequisites, and confirm that the open decisions the sprint depends on (master plan §12) are closed.
2.  **Architecture & Test Contracts (`role-fullstack-architect` & `role-sdet-architect`)**: Document contracts in `docs/` and author `docs/testing/test_cases_catalog_PXX_SYY.md` (code sprints only).
3.  **Implementation (lead persona from the sprint's `## Personas`)**: Implement changes that adhere to Zod schemas and tenant isolation.
4.  **Verification & Quality Gates (`role-sdet-architect` & `role-security-engineer`)**: Run test suites, verify zero flakiness, audit tenant isolation.
5.  **Product Acceptance (`role-product-owner`)**: Verify functional requirements and UX quality.
6.  **Release Preparation (`role-devops-engineer`)**: Validate the build, confirm the CI workflow passes, write `docs/walkthroughs/walkthrough-PXX-SYY.md`, and prepare the PR.

---

## 🚦 Quality Gate Verification Checklist

Before any **code** sprint is marked complete in `task.md`, validate these gates by actually running the commands (they exist from P02-S01 onward):

```powershell
# Turborepo Quality Gate Pipeline
npm run lint                  # 0 ESLint errors or warnings (includes boundary rules)
npm run typecheck             # 0 TypeScript compiler errors across all apps & packages
npm run test                  # 100% passing unit & integration tests, coverage thresholds met
npm run test:contract         # Real-Redis/BullMQ contract tests (required in CI; locally when REDIS_URL is set)
npm run test:e2e              # Playwright, required for sprints that change UI or user journeys
npm run build                 # Successful build of all packages and applications
npm audit --audit-level=high  # Zero critical or high security vulnerabilities
```

**Documentation-only sprints** (Phase 01) are verified by review against their acceptance criteria and by cross-checking against the master plan. The code gates do not apply until P02-S01 creates the scripts.

Never mark a task `[x]` or claim acceptance unless you observed verifiable command output. Never skip, `.only`, or delete a failing test to get a green run.
