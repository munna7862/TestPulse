# TestPulse — Agent Knowledge & Engineering Guidelines

This document serves as the **always-on memory and operational baseline** for all AI models, agent personas, and human engineers working on the `TestPulse` monorepo. It codifies the architecture, boundaries, environment constraints, and non-negotiable rules to maintain high quality and velocity.

---

## 🧭 Repository Overview & Tech Stacks

`TestPulse` is a multi-tenant SaaS application for real-time test execution monitoring, collaborative flaky test triage, and automated quarantine lifecycle management.

### Monorepo Topology
```text
testpulse/
├── apps/
│   ├── web/               # Next.js 15 (App Router, React 19, Tailwind CSS v4, Radix UI)
│   └── api/               # Fastify API & Socket.IO server, BullMQ background jobs
├── packages/
│   ├── shared/            # Zod schemas, TypeScript types, typed event contracts, shared utils
│   ├── db/                # Prisma ORM, PostgreSQL schema, tenant isolation client extension
│   ├── ui/                # Shared design system primitive components (Radix + Tailwind)
│   └── reporter/          # Standalone CI reporter npm package for test runners (Playwright, Jest, Vitest)
├── planning/              # Master plan, phase blueprints, sprint decomposition files
├── .agents/skills/        # Codified virtual persona skills and development standards
└── task.md                # Centralized sprint and task execution tracking board
```

### Technology Stacks
*   **Frontend (`apps/web`)**: Next.js 15 (App Router), React 19, TanStack React Query v5, Zustand, Tailwind CSS v4, Radix UI primitives, Lucide React, Recharts.
*   **Backend (`apps/api`)**: Fastify v4/v5, `@fastify/jwt`, `@fastify/cors`, `@fastify/rate-limit`, Zod validation, Socket.IO v4, BullMQ background jobs.
*   **Database (`packages/db`)**: Prisma ORM, PostgreSQL (Neon / Supabase cloud-native with connection pooling).
*   **Shared (`packages/shared`)**: Typed events, Zod schemas, domain models, Redis (ioredis) client helper.
*   **Real-time Infrastructure**: Redis Pub/Sub (`@socket.io/redis-adapter`) for horizontally scalable WebSocket broadcasting.
*   **Testing Toolchain**: Vitest (unit/integration), Playwright (E2E), Supertest (API), MSW (network mocking), `ioredis-mock` (local Redis mocking).

---

## ⚡ Core Rules & Non-Negotiables (Must Follow)

### 1. Tenant Isolation (Critical Security Mandate)
*   **Rule**: Every single database query must include tenant context (`orgId` and/or `projectId`).
*   **Enforcement**: Data access must utilize the Prisma tenant-extension pattern or explicit repository scoping. Cross-tenant data leakage is a critical, release-blocking vulnerability.
*   **Authorization**: API keys are project-scoped and ingestion-only; user sessions are organization- and project-scoped based on RBAC roles (`Owner`, `Admin`, `Member`, `Viewer`).

### 2. Strict Typing & Schema Validation
*   **Rule**: Zero `any` types. Strict mode must be enabled across all `tsconfig.json` files (`"strict": true`, `"noImplicitAny": true`).
*   **Boundaries**: All data crossing boundaries (API requests, responses, WebSocket payloads, background job data) MUST be validated with Zod schemas defined in `packages/shared`.
*   **Inference**: TypeScript types must be derived from Zod schemas via `z.infer<typeof Schema>` to prevent type/schema drift.

### 3. Real-Time Architecture & Scaling
*   **Rule**: API route handlers must NEVER emit events directly to Socket.IO clients.
*   **Pattern**: API Handler -> DB Mutation -> Publish to Redis -> Socket.IO Server receives from Redis -> Broadcast to authorized project/organization rooms.
*   **Payloads**: WebSocket payloads must be lean (entity IDs, status, diffs), prompting clients to fetch or patch state efficiently.

### 4. Monorepo Package Boundaries
*   `packages/shared` cannot import from `apps/*`, `packages/db`, or `packages/ui`.
*   `packages/db` cannot import from `apps/*` or `packages/ui`.
*   `apps/web` (Frontend) cannot import from `packages/db` (Backend DB). All web data access must go through the API (`apps/api`).
*   Internal package imports use the `@testpulse/*` namespace (`@testpulse/shared`, `@testpulse/db`, `@testpulse/ui`, `@testpulse/reporter`).

### 5. Cross-Platform & Environment Compatibility
*   **Operating System**: The primary development environment includes Windows PowerShell.
*   **Tooling Rules**:
    *   Never use bash-specific command chains (`&&`, `export FOO=bar`, `/bin/sh`) in npm scripts. Use `cross-env`, `rimraf`, and Node-native CLI tools.
    *   Avoid hardcoded POSIX paths (`/tmp`, `/etc`). Always use Node `path` module (`path.join()`, `path.resolve()`).
    *   Ensure Git line endings are normalized (`core.autocrlf = true` or `.gitattributes` with `* text=auto eol=lf`).
*   **Docker-Free Local Development & Testing**:
    *   Do not assume a local Docker daemon is running.
    *   Local and CI test suites must run seamlessly using `ioredis-mock` for Redis and isolated PostgreSQL schemas / transactions / cloud database branches (Neon).

### 6. No Speculative Features
*   Adhere strictly to the active sprint plan. Do not build features (such as Stripe billing, SSO/SAML, or AI-powered root-cause diagnosis) that are explicitly deferred to future phases.

---

## 🤖 Virtual Sprint Team & Agent Personas

The monorepo operates with 10 specialized virtual agent personas to drive execution sprint-by-sprint. Their detailed instructions are located in `.agents/skills/`:

| Persona | Skill Directory | Primary Responsibilities |
| :--- | :--- | :--- |
| **Scrum Master** | [`.agents/skills/role-scrum-master`](.agents/skills/role-scrum-master/SKILL.md) | Sprint orchestration, `task.md` tracking, dependency routing, phase gates |
| **Product Owner** | [`.agents/skills/role-product-owner`](.agents/skills/role-product-owner/SKILL.md) | Acceptance review, UX standards, pricing tier boundaries, release sign-off |
| **Fullstack Architect** | [`.agents/skills/role-fullstack-architect`](.agents/skills/role-fullstack-architect/SKILL.md) | System design, monorepo boundaries, API contracts, data models, ADRs |
| **Backend Engineer** | [`.agents/skills/role-backend-engineer`](.agents/skills/role-backend-engineer/SKILL.md) | Fastify API, Prisma migrations, BullMQ workers, ingestion pipeline |
| **Frontend Engineer** | [`.agents/skills/role-frontend-engineer`](.agents/skills/role-frontend-engineer/SKILL.md) | Next.js 15 UI, React Query hooks, Zustand state, Tailwind v4, Radix components |
| **Real-Time Engineer** | [`.agents/skills/role-realtime-engineer`](.agents/skills/role-realtime-engineer/SKILL.md) | Socket.IO gateway, Redis pub/sub adapter, room auth, connection resilience |
| **SDET Architect** | [`.agents/skills/role-sdet-architect`](.agents/skills/role-sdet-architect/SKILL.md) | Test pyramid, test cases catalog, anti-flakiness, coverage, CI quality gates |
| **Security Engineer** | [`.agents/skills/role-security-engineer`](.agents/skills/role-security-engineer/SKILL.md) | Tenant isolation audits, RBAC verification, API key hashing, OWASP compliance |
| **DevOps Engineer** | [`.agents/skills/role-devops-engineer`](.agents/skills/role-devops-engineer/SKILL.md) | Turborepo CI/CD pipelines, Vercel/Railway deploys, monitoring, environment configs |
| **Growth Engineer** | [`.agents/skills/role-growth-engineer`](.agents/skills/role-growth-engineer/SKILL.md) | Landing page, SEO, analytics telemetry, onboarding time-to-first-value, GTM |

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

### Sprint Lifecycle Steps:
1.  **Kick-off (`role-scrum-master`)**: Create feature branch `feat/PXX-SYY-<description>`, initialize sprint tasks in `task.md`, verify prerequisites.
2.  **Architecture & Test Contracts (`role-fullstack-architect` & `role-sdet-architect`)**: Document contracts in `docs/` and author `docs/testing/test_cases_catalog_PXX_SYY.md`.
3.  **Implementation (`role-backend-engineer` / `role-frontend-engineer` / `role-realtime-engineer`)**: Implement code changes adhering to Zod schemas and tenant isolation.
4.  **Verification & Quality Gates (`role-sdet-architect` & `role-security-engineer`)**: Run test suites, verify zero flakiness, audit tenant isolation.
5.  **Product Acceptance (`role-product-owner`)**: Verify functional requirements and UX quality.
6.  **Release Preparation (`role-devops-engineer`)**: Validate build, verify CI workflow pass, and prepare PR.

---

## 🚦 Quality Gate Verification Checklist

Before any sprint is marked complete in `task.md`, the following gates must be validated via real command execution:

```powershell
# Turborepo Quality Gate Pipeline
npm run lint          # 0 ESLint errors or warnings
npm run typecheck     # 0 TypeScript compiler errors across all apps & packages
npm run test          # 100% passing unit & integration tests
npm run build         # Successful build of all packages and applications
npm audit             # Zero critical or high security vulnerabilities
```

Never mark a task `[x]` or claim acceptance unless verifiable test output was observed.
