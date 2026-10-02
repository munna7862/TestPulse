# Master Plan: TestPulse — Real-Time Test Execution Dashboard SaaS

**Project codename:** `TestPulse`\
**Target platform:** Web SaaS (responsive, cloud-native)\
**Development approach:** AI-assisted, agent-first development with Google Antigravity\
**Primary developer stack:** Next.js 15 (React 19) + Fastify + TypeScript + PostgreSQL (Neon) + Redis (Upstash)\
**Real-time engine:** WebSockets (Socket.IO v4) with Redis adapter for horizontal scaling\
**Initial release:** MVP — live test run streaming, flaky-test triage, quarantine lifecycle, team workspaces\
**Future releases:** Billing, CI integrations marketplace, mobile companion, AI-powered failure diagnosis

---

## 1. Executive Vision

Build a production-grade SaaS application that lets QA teams, SDETs, and engineering managers **watch test runs in real-time**, annotate flaky tests collaboratively, manage quarantine lifecycles, and receive intelligent alerts — all from a single premium dashboard.

TestPulse solves a pain point every engineering team with >50 tests faces: **"What broke? Is it flaky? Who's looking at it?"**

### Why TestPulse?

- **Existing tools are fragmented.** Allure, ReportPortal, and Grafana dashboards show results *after* the run finishes. TestPulse shows them *live as tests execute*.
- **Flaky test management is ad-hoc.** Most teams track flaky tests in spreadsheets or Slack threads. TestPulse makes quarantine a first-class, SLA-backed lifecycle.
- **No one owns test health.** TestPulse introduces team-based accountability with clear ownership, SLA timers, and automated escalation policies.

### The first release (MVP) supports:

- User authentication (secure email/password + OAuth via Google/GitHub).
- Multi-tenant organization workspaces with strict role-based access control (`Owner`, `Admin`, `Member`, `Viewer`).
- Project creation and management within organizations.
- Real-time test run streaming (WebSocket-powered live dashboard with Redis Pub/Sub).
- Test result ingestion via high-throughput REST API and CI reporter plugins (`@testpulse/reporter`).
- Individual test case detail view with historical execution timelines and failure stack traces.
- Flaky test detection (heuristic-based: >=3 flip-flops in last 10 runs) and collaborative triage.
- Quarantine lifecycle management (`quarantined` -> `investigating` -> `resolved` / `dismissed`).
- Real-time collaborative annotations (comments, status changes, assignments).
- Notification system (in-app notification center + email alerts for SLA escalations).
- Dashboard analytics (pass rate trends, duration metrics, MTTR for flaky tests, top failing tests).
- Responsive web UI with dark and light themes (Tailwind CSS v4 + Radix UI).
- API key management for CI/CD pipeline authentication (hashed storage, project-scoped).
- Comprehensive test automation suites (Vitest, Playwright, Supertest, MSW).
- Turborepo monorepo with automated GitHub Actions CI/CD pipelines.

### Non-MVP Exclusions (Do NOT build in v1):

- Stripe billing and paid subscription tiers (reserved for post-MVP phase).
- CI integrations marketplace / auto-configurator (v1 uses standard REST API and `@testpulse/reporter`).
- AI-powered failure diagnosis and auto-triage (future extension).
- Slack / Teams / Discord bot integrations (v1 uses webhooks and email).
- Mobile companion application.
- SSO / SAML for enterprise identity providers.
- Self-hosted / on-premise deployment mode.
- Video / large binary test artifact storage (v1 focuses on logs, metadata, and error stacks).

---

## 2. Antigravity Agent-First Operating Model

Google Antigravity is an agent-first development environment. The core operational rule:

> Do not ask one AI agent to "build the SaaS." Give specialized agent personas explicit architectural contracts, verifiable acceptance criteria, and small granular sprints.

The monorepo codifies 10 specialized agent personas mapped to skills in `.agents/skills/`:

| Persona | Skill Directory | Responsibilities |
| :--- | :--- | :--- |
| **Scrum Master** | [`.agents/skills/role-scrum-master`](../../.agents/skills/role-scrum-master/SKILL.md) | Sprint planning, task breakdown in `task.md`, dependency routing, ceremony discipline |
| **Product Owner** | [`.agents/skills/role-product-owner`](../../.agents/skills/role-product-owner/SKILL.md) | Feature acceptance, UX review, tier boundary enforcement, release sign-off |
| **Fullstack Architect** | [`.agents/skills/role-fullstack-architect`](../../.agents/skills/role-fullstack-architect/SKILL.md) | Monorepo structure, API contracts, database schema, tenant isolation design, ADRs |
| **Backend Engineer** | [`.agents/skills/role-backend-engineer`](../../.agents/skills/role-backend-engineer/SKILL.md) | Fastify API server, Prisma ORM, BullMQ background jobs, ingestion pipeline |
| **Frontend Engineer** | [`.agents/skills/role-frontend-engineer`](../../.agents/skills/role-frontend-engineer/SKILL.md) | Next.js 15 UI, React Query hooks, Zustand state, Tailwind v4, Radix components |
| **Real-Time Engineer** | [`.agents/skills/role-realtime-engineer`](../../.agents/skills/role-realtime-engineer/SKILL.md) | Socket.IO server, Redis pub/sub adapter, room auth, connection resilience |
| **SDET Architect** | [`.agents/skills/role-sdet-architect`](../../.agents/skills/role-sdet-architect/SKILL.md) | Test pyramid, test cases catalog, anti-flakiness, coverage, CI quality gates |
| **Security Engineer** | [`.agents/skills/role-security-engineer`](../../.agents/skills/role-security-engineer/SKILL.md) | Tenant isolation audits, RBAC verification, API key hashing, OWASP compliance |
| **DevOps Engineer** | [`.agents/skills/role-devops-engineer`](../../.agents/skills/role-devops-engineer/SKILL.md) | Turborepo CI/CD pipelines, Vercel/Railway deploys, monitoring, environment configs |
| **Growth Engineer** | [`.agents/skills/role-growth-engineer`](../../.agents/skills/role-growth-engineer/SKILL.md) | Landing page, SEO, analytics telemetry, onboarding time-to-first-value, GTM |

---

## 3. Technology Stack & Monorepo Topology

### 3.1 Monorepo Structure

```text
testpulse/
├── apps/
│   ├── web/               # Next.js 15 (App Router, React 19, Tailwind CSS v4, Radix UI)
│   └── api/               # Fastify API server & Socket.IO gateway, BullMQ workers
├── packages/
│   ├── shared/            # Zod schemas, TypeScript types, event definitions, shared utilities
│   ├── db/                # Prisma ORM schema, migrations, tenant-scoped database client
│   ├── ui/                # Shared design system primitive components (Radix + Tailwind)
│   └── reporter/          # Standalone CI reporter npm package for test runners
├── planning/              # Master plan, phase blueprints, sprint decomposition files
├── .agents/skills/        # Codified virtual persona skills and development standards
└── task.md                # Centralized sprint and task execution tracking board
```

### 3.2 Monorepo Boundaries & Dependency Graph

```text
       apps/web                 apps/api
     /          \             /          \
    v            v           v            v
@testpulse/ui  @testpulse/shared  @testpulse/db
                      ^                  |
                      |                  v
                      +--------- (Prisma & Postgres)
```

- **Rule 1:** `apps/web` must NEVER import `@testpulse/db`. All data access must pass through `apps/api`.
- **Rule 2:** `@testpulse/shared` is purely decoupled: it cannot import from `apps/*`, `@testpulse/db`, or `@testpulse/ui`.
- **Rule 3:** All cross-boundary communications (HTTP requests, Socket.IO events, BullMQ jobs) must validate payloads using Zod schemas defined in `@testpulse/shared`.

### 3.3 Target Technology Stacks

- **Frontend:** Next.js 15, React 19, TypeScript (strict mode), TanStack React Query v5, Zustand, Tailwind CSS v4, Radix UI primitives, Recharts, Lucide React.
- **Backend:** Node.js (v20+ LTS / v24), Fastify v4/v5, `@fastify/jwt`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/sensible`, Socket.IO v4, BullMQ v5.
- **Database:** PostgreSQL 16 (hosted on Neon with connection pooling / PgBouncer), Prisma ORM 5/6 with custom tenant extension.
- **Real-Time & Cache:** Redis (Upstash in cloud, `ioredis-mock` for local tests and development), `@socket.io/redis-adapter`.
- **Testing:** Vitest (unit/integration), Playwright (E2E), Supertest (HTTP integration), MSW (Mock Service Worker).

---

## 4. Architecture & System Flow

```text
                         TestPulse Architecture Overview
                                        |
         +------------------------------+------------------------------+
         |                                                             |
   Next.js 15 (Web)                                           Fastify API & Socket.IO
   (Vercel Hosting)                                              (Railway / Cloud)
         |                                                             |
         | (HTTPS / REST)                                              | (Redis Adapter)
         +----------------------------->+<-----------------------------+
                                        |
                             +----------+----------+
                             |                     |
                      PostgreSQL 16              Redis
                   (Neon Serverless)        (Upstash Cloud)
```

### 4.1 Ingestion Flow & Real-Time Broadcast

```text
CI Runner (Playwright/Jest using @testpulse/reporter)
    |
    | 1. HTTP POST /api/v1/projects/:projectId/runs (Bearer ApiKey)
    v
Fastify API Server
    |
    | 2. Authenticate API Key (hashed verify) & Validate Payload (Zod)
    | 3. Persist Run & Results to PostgreSQL via Prisma batch transaction
    v
Redis Pub/Sub
    |
    | 4. PUBLISH channel "project:{projectId}:events"
    v
Socket.IO Gateway
    |
    | 5. Broadcast event "run:result" to room "project:{projectId}"
    v
Connected Browser Clients (Next.js Dashboard)
```

---

## 5. Domain Model & Multi-Tenant Data Schema

### 5.1 Core Database Entities

1. **User**: Authentication record (`id`, `email`, `passwordHash`, `name`, `avatarUrl`, timestamps).
2. **Organization**: Tenant boundary (`id`, `name`, `slug`, `planTier`, timestamps).
3. **OrgMember**: Membership junction (`id`, `orgId`, `userId`, `role` [OWNER, ADMIN, MEMBER, VIEWER]).
4. **Project**: Workspace project (`id`, `orgId`, `name`, `slug`, `description`, timestamps).
5. **ApiKey**: CI ingestion credential (`id`, `projectId`, `name`, `keyHash`, `lastUsedAt`, `expiresAt`).
6. **TestSuite**: Test file / suite group (`id`, `projectId`, `name`, `filePath`, timestamps).
7. **TestCase**: Unique test definition (`id`, `projectId`, `suiteId`, `name`, `identifier`, `isFlaky`, `isQuarantined`, timestamps).
8. **TestRun**: Single CI pipeline execution (`id`, `projectId`, `runNumber`, `status` [RUNNING, PASSED, FAILED, COMPLETED], `branch`, `commitSha`, `ciProvider`, `durationMs`, timestamps).
9. **TestResult**: Result for a test case in a run (`id`, `runId`, `testCaseId`, `status` [PASSED, FAILED, SKIPPED, FLAKY], `durationMs`, `errorMessage`, `stackTrace`).
10. **QuarantineRecord**: SLA-backed quarantine record (`id`, `projectId`, `testCaseId`, `status` [ACTIVE, INVESTIGATING, RESOLVED, DISMISSED], `reason`, `slaExpiresAt`, `assignedToId`).
11. **Annotation**: Triage comment / tag (`id`, `projectId`, `testCaseId`, `userId`, `content`, `tags`, timestamps).
12. **Notification**: User alert (`id`, `userId`, `orgId`, `title`, `message`, `type`, `read`, timestamps).

### 5.2 Compound Indexing & Isolation Rules

- `TestCase`: `@@unique([projectId, identifier])`
- `TestRun`: `@@index([projectId, createdAt])`
- `TestResult`: `@@index([runId, status])`
- `OrgMember`: `@@unique([orgId, userId])`

---

## 6. Real-Time Event Registry

All events are defined in `@testpulse/shared/events` with corresponding Zod schemas:

| Redis Channel | Socket.IO Event | Payload Schema | Description |
| :--- | :--- | :--- | :--- |
| `project:{projectId}:events` | `run:started` | `RunStartedEvent` | Triggered when a new test run is registered from CI |
| `project:{projectId}:events` | `run:result` | `RunResultEvent` | Real-time stream of individual test case completion |
| `project:{projectId}:events` | `run:completed` | `RunCompletedEvent` | Triggered when all tests in a run finish |
| `project:{projectId}:events` | `quarantine:changed` | `QuarantineChangedEvent` | Test case quarantined or resolved |
| `project:{projectId}:events` | `annotation:created` | `AnnotationCreatedEvent` | New collaborative triage note added |
| `user:{userId}:notifications` | `notification:new` | `NotificationEvent` | User notification (e.g. quarantine SLA warning) |

---

## 7. Monetization & Pricing Boundaries

| Feature | Free Tier | Pro Tier ($29/seat/mo) | Enterprise Tier |
| :--- | :--- | :--- | :--- |
| Projects | 2 | Unlimited | Unlimited |
| Test Runs / Month | 500 | 10,000 | Unlimited |
| History Retention | 7 Days | 90 Days | Custom / 1 Year+ |
| Team Members | 3 | 25 | Unlimited |
| Real-Time Dashboard | Included | Included | Included |
| Flaky Detection | Heuristic (basic) | Heuristic + Trend Analysis | Heuristic + Custom Policies |
| Quarantine Lifecycle | Basic | Full SLA & Escalations | Custom Workflow Rules |
| Integrations | GitHub CI reporter | All CI runners | Custom & On-Prem runners |

---

## 8. 11-Phase Implementation Roadmap

The project is structured across 11 sequential phases encompassing 58 granular sprints:

- **Phase 01: Product & Architecture Foundation** (5 sprints) — Requirements, wireframes, system design, security model, testing strategy.
- **Phase 02: Project Bootstrap & DevOps** (5 sprints) — Turborepo, Next.js, Fastify, Prisma, CI/CD pipelines.
- **Phase 03: Authentication & Multi-Tenancy** (6 sprints) — Auth.js, JWT, Org/Project CRUD, RBAC, API keys, security audit.
- **Phase 04: Test Run Ingestion & Data Model** (6 sprints) — Ingestion API, batch processor, `@testpulse/reporter`, deduplication.
- **Phase 05: Real-Time Dashboard** (6 sprints) — Socket.IO server, Redis adapter, live test run UI, test detail views.
- **Phase 06: Flaky Test Detection & Quarantine** (5 sprints) — Flaky detection engine, quarantine state machine, collaborative triage.
- **Phase 07: Notifications & Integrations** (5 sprints) — In-app notifications, email alerts, SLA escalation worker, webhooks.
- **Phase 08: Analytics & Reporting** (4 sprints) — Aggregation pipeline, pass-rate trends, MTTR metrics, export reports.
- **Phase 09: UX Polish & Accessibility** (5 sprints) — Design tokens, light/dark theme, micro-animations, keyboard navigation.
- **Phase 10: Quality Engineering & Release** (6 sprints) — Coverage audit, E2E regression, load testing, security review, staging deploy.
- **Phase 11: Landing Page, Docs & Go-to-Market** (5 sprints) — Marketing site, documentation site, CI integration guides, Product Hunt launch.

---

## 9. Non-Functional Performance & Reliability SLAs

- **Dashboard Initial Load:** LCP < 2.0s on standard 4G/broadband connections.
- **Real-Time Streaming Latency:** < 200ms from Redis PUBLISH to browser UI update.
- **Ingestion Throughput:** Ingest up to 10,000 test results in < 5 seconds via batch API.
- **Uptime Target:** 99.9% availability for core ingestion API.
- **Cross-Platform Compatibility:** Full support for Windows PowerShell and POSIX developer environments.
- **Resilience:** Auto-reconnecting WebSocket client with state-recovery polling fallback.
