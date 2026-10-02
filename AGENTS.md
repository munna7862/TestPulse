# TestPulse — Agent Knowledge & Engineering Guidelines

This document serves as the **always-on memory and operational baseline** for all AI models and human engineers working on the `TestPulse` monorepo. It codifies the architecture, boundaries, and non-negotiable rules to maintain high quality and velocity.

---

## 🧭 Repository Overview & Tech Stacks

`TestPulse` is a multi-tenant SaaS application for real-time test execution monitoring and flaky test management.

*   **Frontend (`apps/web`)**: Next.js 15 (App Router), React Query, Tailwind CSS, Radix UI.
*   **Backend (`apps/api`)**: Fastify, Zod validation, Socket.IO.
*   **Database (`packages/db`)**: Prisma ORM, PostgreSQL (Neon).
*   **Shared (`packages/shared`)**: Typed events, Zod schemas, Redis (ioredis) client.
*   **UI (`packages/ui`)**: Shared component library.
*   **Real-time Infrastructure**: Socket.IO with Redis adapter for horizontal scaling.

---

## ⚡ Core Rules & Non-Negotiables (Must Follow)

### 1. Tenant Isolation
*   **Rule**: Every single database query must include tenant context (`orgId` and/or `projectId`).
*   **Enforcement**: The `Security Engineer` persona must audit all data access patterns. Cross-tenant data leakage is a critical failure.

### 2. Strict Typing & Schema Validation
*   **Rule**: Zero `any` types. Strict mode must be enabled across all `tsconfig.json` files.
*   **Boundaries**: All data crossing boundaries (API requests, WebSocket payloads) MUST be validated with Zod schemas defined in `packages/shared`.

### 3. Real-Time Architecture
*   **Rule**: API handlers must NEVER emit events directly to Socket.IO clients.
*   **Pattern**: API Handler -> DB Mutation -> Publish to Redis -> Socket.IO Server receives from Redis -> Broadcast to connected clients.
*   **Why**: This is the only way to support horizontally scaling the WebSocket server across multiple instances.

### 4. Monorepo Boundaries
*   `packages/shared` cannot import from `apps/*`, `packages/db`, or `packages/ui`.
*   `apps/web` (Frontend) cannot import from `packages/db` (Backend DB). All data fetching must go through the API.

### 5. No Speculative Features
*   Adhere strictly to the active sprint plan. Do not build features (like billing, SSO, or AI analysis) that are explicitly excluded from the MVP scope.

---

## 🤖 Virtual Sprint Team & Agent Personas

The monorepo operates with 10 specialized virtual agent personas to drive execution sprint-by-sprint. You can find their detailed instructions in `.agents/skills/`:

1.  [**`role-scrum-master`**](.agents/skills/role-scrum-master/SKILL.md): Sprint ceremony, task breakdown (`task.md`), and workflow discipline.
2.  [**`role-product-owner`**](.agents/skills/role-product-owner/SKILL.md): UX quality, feature acceptance, and tier boundary enforcement.
3.  [**`role-fullstack-architect`**](.agents/skills/role-fullstack-architect/SKILL.md): Monorepo structure, API contracts, and tenant isolation design.
4.  [**`role-backend-engineer`**](.agents/skills/role-backend-engineer/SKILL.md): Fastify API, Prisma DB, ingestion pipeline, and BullMQ background jobs.
5.  [**`role-frontend-engineer`**](.agents/skills/role-frontend-engineer/SKILL.md): Next.js UI, React Query, Tailwind CSS, and UX interactions.
6.  [**`role-realtime-engineer`**](.agents/skills/role-realtime-engineer/SKILL.md): Socket.IO infrastructure, Redis pub/sub, and connection resilience.
7.  [**`role-sdet-architect`**](.agents/skills/role-sdet-architect/SKILL.md): Test strategy, flaky test prevention, and CI quality gates.
8.  [**`role-security-engineer`**](.agents/skills/role-security-engineer/SKILL.md): Tenant isolation enforcement, OWASP compliance, and RBAC.
9.  [**`role-devops-engineer`**](.agents/skills/role-devops-engineer/SKILL.md): CI/CD pipelines, Vercel/Railway deployments, and monitoring.
10. [**`role-growth-engineer`**](.agents/skills/role-growth-engineer/SKILL.md): Landing page, SEO, product analytics, and GTM execution.

### Additional Standards
*   [**`dev-coding-standards`**](.agents/skills/dev-coding-standards/SKILL.md): Rules for TypeScript, React, Fastify, Prisma.
*   [**`doc-implementation-standards`**](.agents/skills/doc-implementation-standards/SKILL.md): Rules for updating architectural, testing, and UX docs.

---

## 🏃 Sprint Execution Protocol & Handoffs

Whenever a sprint is kicked off:
1.  **Kick-off (`role-scrum-master`)**: Creates feature branch, initializes root `task.md`, verifies phase prerequisites.
2.  **Design (`role-fullstack-architect` / `role-product-owner`)**: Finalizes UI/API contracts and architecture.
3.  **Implementation (`role-backend-engineer` / `role-frontend-engineer` / `role-realtime-engineer`)**: Executes code changes per the sprint tasks.
4.  **Quality Assurance (`role-sdet-architect` / `role-security-engineer`)**: Adds tests, validates security boundaries, and verifies quality gates (lint, typecheck, tests).
5.  **Acceptance (`role-product-owner`)**: Approves UX and feature completeness.
6.  **Release (`role-devops-engineer`)**: Manages PR creation, CI workflows, and staging deployment.

### Conditional Quality Gates
*   **Backend API Sprints**: Require Backend + Security + SDET sign-off.
*   **Frontend/UI Sprints**: Require Frontend + SDET + Product Owner sign-off.
*   **Real-Time Sprints**: Require Real-Time + SDET sign-off.
