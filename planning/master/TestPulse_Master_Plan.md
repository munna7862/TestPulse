# Master Plan: TestPulse — Real-Time Test Execution Dashboard SaaS

**Project codename:** `TestPulse`\
**Target platform:** Web SaaS (responsive, cloud-native)\
**Development approach:** AI-assisted, agent-first development with Google Antigravity\
**Primary developer stack:** Next.js 16 (React 19) + Fastify 5 + TypeScript 6 + Prisma 7 + PostgreSQL (Neon) + Redis (pinned in ADR-004)\
**Runtime baseline:** Node.js 24 LTS (Node 20 reached end-of-life in April 2026)\
**Real-time engine:** WebSockets (Socket.IO v4) with Redis adapter for horizontal scaling\
**Hosting:** **free-tier profile** until the product is feature-complete (§4.4); the paid production setup is decided in P10-S06\
**Initial release:** MVP — live test run streaming, flaky-test triage, quarantine lifecycle, team workspaces\
**Future releases:** Billing, CI integrations marketplace, mobile companion, AI-powered failure diagnosis

---

## 0. Source of Truth & Change Control

This file is the **canonical contract** for the items below. Phase blueprints and sprint files reference these sections instead of redefining them:

| Contract | Section |
| :--- | :--- |
| Ingestion API (CI → TestPulse) | [§4.2](#42-ingestion-api-contract) |
| Real-time fan-out & event registry | [§4.3](#43-real-time-fan-out), [§6](#6-event-registry) |
| Domain model & indexes | [§5](#5-domain-model--multi-tenant-data-schema) |
| RBAC matrix & tenant isolation rules | [§7](#7-authorization--tenant-isolation) |
| Plan limits | [§8](#8-plans--limits) |
| Deployment profiles (free → paid) | [§4.4](#44-deployment-profiles) |
| Non-functional targets | [§10](#10-non-functional-targets) |
| Feature catalog (FR IDs) | [`docs/product/feature-catalog.md`](../../docs/product/feature-catalog.md) |
| Test scenario catalog (SC IDs) | [`docs/testing/scenario-catalog.md`](../../docs/testing/scenario-catalog.md) |

**Rules:**
1. If a phase or sprint file conflicts with this document, this document wins. Fix the conflicting file in the same PR.
2. A sprint that needs to change one of these contracts must (a) record an ADR in `docs/architecture/`, and (b) update this file in the same PR.
3. Resolved decisions live in the [Decision Log](#11-decision-log). Open questions live in [Open Decisions](#12-open-decisions) with the sprint that must close them.

---

## 1. Executive Vision

Build a production-grade SaaS application that lets QA teams, SDETs, and engineering managers **watch test runs in real-time**, annotate flaky tests collaboratively, manage quarantine lifecycles, and receive intelligent alerts — all from a single premium dashboard.

TestPulse solves a pain point every engineering team with >50 tests faces: **"What broke? Is it flaky? Who's looking at it?"**

### Why TestPulse?

- **Existing tools are fragmented.** Allure, ReportPortal, and Grafana dashboards show results *after* the run finishes. TestPulse shows them *live as tests execute*.
- **Flaky test management is ad-hoc.** Most teams track flaky tests in spreadsheets or Slack threads. TestPulse makes quarantine a first-class, SLA-backed lifecycle.
- **No one owns test health.** TestPulse introduces team-based accountability with clear ownership, SLA timers, and automated escalation policies.

### The first release (MVP) supports:

- User authentication (email/password with email verification + OAuth via Google/GitHub).
- Multi-tenant organization workspaces with role-based access control (`Owner`, `Admin`, `Member`, `Viewer`).
- Project creation and management within organizations.
- Real-time test run streaming (WebSocket-powered live dashboard, results appear while the CI job is still running).
- Incremental test result ingestion via REST API and the `@testpulse/reporter` package (Playwright and Vitest in v1).
- Individual test case detail view with historical execution timelines and failure stack traces.
- Flaky test detection (retry-based and history-based heuristics, see Phase 06) and collaborative triage.
- Quarantine lifecycle management (`ACTIVE` → `INVESTIGATING` → `RESOLVED` / `DISMISSED`, with SLA escalation markers).
- Real-time collaborative annotations (comments, labels, assignments).
- Notification system (in-app notification center + email alerts + outgoing webhooks).
- GitHub reporting from CI (job summary, PR comment / check run using the workflow's `GITHUB_TOKEN`).
- Dashboard analytics (pass rate trends, duration metrics, MTTR for quarantines, top failing tests).
- Responsive web UI with dark and light themes (Tailwind CSS v4 + Radix UI).
- API key management for CI/CD pipeline authentication (hashed storage, project-scoped).
- Plan quotas (Free / Pro / Enterprise) enforced without a payment flow (see §8).
- Comprehensive test automation suites (Vitest, Playwright, Supertest, MSW).
- Turborepo monorepo with automated GitHub Actions CI/CD pipelines.

### Non-MVP Exclusions (Do NOT build in v1):

- Stripe billing, self-serve upgrades, and paid subscription checkout.
- Feature-gating by plan tier (v1 tiers differ by quotas only).
- CI integrations marketplace / auto-configurator (v1 uses the REST API and `@testpulse/reporter`).
- Reporters for Jest, Cypress, Mocha, JUnit-XML upload, etc. (v1 ships Playwright + Vitest; other runners can call the REST API directly).
- A server-side GitHub App (v1 GitHub reporting runs inside CI with `GITHUB_TOKEN`).
- AI-powered failure diagnosis and auto-triage.
- Slack / Teams / Discord bot integrations (v1 uses webhooks and email).
- Public or unauthenticated shareable dashboard links.
- Mobile companion application.
- SSO / SAML for enterprise identity providers.
- Self-hosted / on-premise deployment mode.
- Video / screenshot / trace artifact storage (v1 stores logs, metadata, and error stacks only).

---

## 2. Antigravity Agent-First Operating Model

Google Antigravity is an agent-first development environment. The core operational rule:

> Do not ask one AI agent to "build the SaaS." Give specialized agent personas explicit architectural contracts, verifiable acceptance criteria, and small granular sprints.

The monorepo codifies 10 specialized agent personas mapped to skills in `.agents/skills/`. Every sprint file names its **lead** and **reviewer** personas in a `## Personas` section.

| Persona | Skill Directory | Responsibilities |
| :--- | :--- | :--- |
| **Scrum Master** | [`.agents/skills/role-scrum-master`](../../.agents/skills/role-scrum-master/SKILL.md) | Sprint planning, task breakdown in `task.md`, dependency routing, ceremony discipline |
| **Product Owner** | [`.agents/skills/role-product-owner`](../../.agents/skills/role-product-owner/SKILL.md) | Feature acceptance, UX review, plan-limit enforcement, release sign-off |
| **Fullstack Architect** | [`.agents/skills/role-fullstack-architect`](../../.agents/skills/role-fullstack-architect/SKILL.md) | Monorepo structure, API contracts, database schema, tenant isolation design, ADRs |
| **Backend Engineer** | [`.agents/skills/role-backend-engineer`](../../.agents/skills/role-backend-engineer/SKILL.md) | Fastify API server, Prisma ORM, BullMQ background jobs, ingestion pipeline, reporter package |
| **Frontend Engineer** | [`.agents/skills/role-frontend-engineer`](../../.agents/skills/role-frontend-engineer/SKILL.md) | Next.js UI, React Query hooks, Zustand state, Tailwind v4, Radix components |
| **Real-Time Engineer** | [`.agents/skills/role-realtime-engineer`](../../.agents/skills/role-realtime-engineer/SKILL.md) | Socket.IO gateway, Redis adapter/emitter, room auth, connection resilience |
| **SDET Architect** | [`.agents/skills/role-sdet-architect`](../../.agents/skills/role-sdet-architect/SKILL.md) | Test pyramid, test cases catalog, anti-flakiness, coverage, CI quality gates |
| **Security Engineer** | [`.agents/skills/role-security-engineer`](../../.agents/skills/role-security-engineer/SKILL.md) | Tenant isolation audits, RBAC verification, credential handling, OWASP compliance |
| **DevOps Engineer** | [`.agents/skills/role-devops-engineer`](../../.agents/skills/role-devops-engineer/SKILL.md) | Turborepo CI/CD pipelines, free-tier then paid deploys, monitoring, environment configs |
| **Growth Engineer** | [`.agents/skills/role-growth-engineer`](../../.agents/skills/role-growth-engineer/SKILL.md) | Landing page, docs portal, SEO, privacy-first analytics, onboarding time-to-first-value |

---

## 3. Technology Stack & Monorepo Topology

### 3.1 Monorepo Structure

```text
testpulse/
├── apps/
│   ├── web/               # Next.js 16 (App Router, React 19, Tailwind CSS v4, Radix UI) — app, marketing & docs
│   └── api/               # Fastify 5: two entrypoints
│       ├── src/server.ts  #   HTTP API + Socket.IO gateway
│       └── src/worker.ts  #   BullMQ workers (SLA, flaky analysis, notifications, webhooks, retention, aggregation)
├── packages/
│   ├── shared/            # Isomorphic only: Zod schemas, inferred types, event contracts, plan limits, pure utils
│   ├── db/                # Prisma schema, migrations, tenant-scoped database client
│   ├── ui/                # Shared design system primitives (Radix + Tailwind)
│   └── reporter/          # Published npm package: Playwright + Vitest reporters
├── planning/              # Master plan, phase blueprints, sprint decomposition files
├── docs/                  # Product, architecture, API, testing, ops docs (see doc-implementation-standards)
├── .agents/skills/        # Codified virtual persona skills and development standards
└── task.md                # Centralized sprint and task execution tracking board
```

### 3.2 Monorepo Boundaries & Dependency Graph

```text
   apps/web ───────────┐        apps/api ──────────────┐
      │                │           │                    │
      v                v           v                    v
 @testpulse/ui   @testpulse/shared <──────────── @testpulse/db ──> Prisma / PostgreSQL
                       ^
                       │ (bundled at build time, not a runtime dependency)
              @testpulse/reporter
```

- **Rule 1:** `apps/web` must NEVER import `@testpulse/db`. All data access goes through `apps/api`.
- **Rule 2:** `@testpulse/shared` is isomorphic and decoupled: no imports from `apps/*`, `@testpulse/db`, `@testpulse/ui`, and no Node-only modules (no `ioredis`, `fs`, Prisma). Server-only helpers such as the Redis client live in `apps/api`.
- **Rule 3:** All cross-boundary communication (HTTP requests/responses, Socket.IO events, BullMQ job data, environment variables) is validated with Zod schemas from `@testpulse/shared`.
- **Rule 4:** `@testpulse/reporter` is published to npm, so any code it uses from `@testpulse/shared` must be bundled into its build output (e.g. tsup `noExternal`). Its only runtime dependencies are the test-runner peer dependencies.
- **Rule 5:** Boundaries are enforced mechanically by ESLint (`no-restricted-imports` / `eslint-plugin-boundaries`), not only by review.

### 3.3 Target Technology Stacks

- **Frontend:** Next.js 16, React 19, TypeScript 6 (strict), TanStack React Query v5, Zustand, Tailwind CSS v4 (CSS-first `@theme` tokens), Radix UI primitives, Recharts, Lucide React, `next/font` (self-hosted Inter + JetBrains Mono).
- **Backend:** Node.js 24 LTS, Fastify 5, `fastify-type-provider-zod`, `@fastify/cookie`, `@fastify/jwt`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit` (Redis store), `@fastify/sensible`, `@fastify/swagger` (OpenAPI from Zod), Socket.IO v4, BullMQ v5, pino (with redaction).
- **Database:** PostgreSQL 16 on Neon, Prisma 7.10 with a tenant-scoped client: `@prisma/adapter-pg` on the pooled `DATABASE_URL` at runtime, and `prisma.config.ts` on `DIRECT_URL` for migrations.
- **Real-Time & Queues:** Redis, `@socket.io/redis-adapter` (gateway) + `@socket.io/redis-emitter` (API handlers and workers). See [Open Decision Q3](#12-open-decisions) for the Redis provider.
- **Email:** A `Mailer` interface with a console/file transport for dev and test, and Resend or SMTP in staging/production.
- **Testing:** Vitest (unit/integration), Supertest (HTTP), Playwright (E2E), MSW (component network mocking), `@axe-core/playwright` (accessibility), k6 (load).
- **Observability:** Sentry (web + api + worker), structured JSON logs with tenant context, uptime probe on `/health`.

> **Version pinning:** [ADR-004](../../docs/architecture/adr-004-dependency-baseline.md) pins every major, based on npm on 2026-10-02 plus peer-compatibility checks: TypeScript 6.0 (not 7), Prisma 7.10 (not the 8.0 RC tagged `latest`), ioredis 5 (for `ioredis-mock`), BullMQ 6, Zod 4, Vitest 5, ESLint 10. P02-S01 re-validates the versions before installing. Fastify 4 and Node 20 are end-of-life and must not be used.

---

## 4. Architecture & System Flow

```text
                                TestPulse Architecture Overview

   Browser (Next.js app — Vercel)                           CI Runner (@testpulse/reporter)
        │  HTTPS (cookies)     │ WSS                                  │ HTTPS (Bearer API key)
        v                      v                                      v
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │ apps/api  server.ts (free: 1 Render instance · paid: N instances)              │
 │   Fastify REST  ── RealtimePublisher (redis-emitter) ──┐                       │
 │   Socket.IO gateway  <── @socket.io/redis-adapter <────┤                       │
 └───────────────┬────────────────────────────────────────┼───────────────────────┘
                 │ Prisma                                  │ Redis (pub/sub + BullMQ)
                 v                                         v
        PostgreSQL 16 (Neon)  <──── Prisma ──── apps/api worker.ts (free: in-process · paid: M instances)
```

- **Auth cookies are first-party.** They are `HttpOnly`, `Secure`, `SameSite=Lax`, and host-only on the origin that serves `/api`. In the free profile, the web app proxies `/api/*` to the API (same origin). In the paid profile, `app.<domain>` and `api.<domain>` share one registrable domain. See §4.4.
- **Sockets authenticate with a short-lived ticket**, not cookies: `POST /api/v1/realtime/ticket` returns a 60-second, single-use token (stored in Redis) that the client passes in the Socket.IO `auth` payload. This works in both profiles, even when the gateway is on a different site.
- With more than one gateway instance, Socket.IO's HTTP long-polling transport requires sticky sessions. If the host cannot provide them, configure clients for `transports: ["websocket"]` and rely on the REST polling fallback (P05-S06).

### 4.1 Ingestion Flow & Real-Time Broadcast

```text
CI Runner (Playwright/Vitest + @testpulse/reporter)
    │ 1. POST /api/v1/ingest/runs                 (once per shard; idempotent on externalRunId)
    │ 2. POST /api/v1/ingest/runs/:runId/results  (every ~1s or 200 results while tests execute)
    │ 3. POST /api/v1/ingest/runs/:runId/complete (once per shard)
    v
Fastify API
    │ a. Authenticate API key (SHA-256 lookup) → tenant context {orgId, projectId}
    │ b. Validate payload (Zod) · enforce quota and rate limit
    │ c. Upsert suites/cases, upsert results in one transaction
    │ d. AFTER COMMIT: RealtimePublisher.emit("run:progress", lean payload)
    v
Redis (socket.io adapter channel)
    │
    v
Every gateway instance delivers to ITS OWN sockets in room "project:{projectId}"
    │
    v
Connected browsers patch the React Query cache (or refetch on gaps)
```

### 4.2 Ingestion API Contract

All ingestion routes authenticate with `Authorization: Bearer tp_live_<key>`. The **project is derived from the key**; it is never taken from the path or body.

| Step | Route | Request (summary) | Behavior |
| :--- | :--- | :--- | :--- |
| Start | `POST /api/v1/ingest/runs` | `externalRunId`, `branch`, `commitSha`, `ciProvider`, `ciJobUrl?`, `environment?`, `shardIndex`, `shardTotal`, `expectedTestCount?`, `startedAt` | Creates the run, or returns the existing run for `(projectId, externalRunId)` so parallel shards join one run. Allocates `runNumber` atomically. Emits `run:started` on create only. Counts toward the monthly run quota on create only. |
| Results | `POST /api/v1/ingest/runs/:runId/results` | `batchId`, `results[]` (≤ 1,000 items and ≤ 5 MB) | Upserts `TestSuite`/`TestCase` by fingerprint and `TestResult` on `(runId, testCaseId)`, so retried batches are idempotent. Rejects the whole batch on validation failure (400 with per-index details). Updates `lastActivityAt` and counters. Emits `run:progress`. |
| Complete | `POST /api/v1/ingest/runs/:runId/complete` | `shardIndex`, `outcome` (`passed`/`failed`/`interrupted`) | Marks the shard done. When all shards are done: computes the final status, emits `run:completed`, and enqueues the `flaky-analysis` job. |
| Quarantine list | `GET /api/v1/ingest/quarantined-tests` | — | Returns the fingerprints of tests with an open quarantine, so reporters in opt-in non-blocking mode can unblock CI when every failure is quarantined (D-16). |

- **Full wire contract** (all fields, responses, error handling, examples): [`docs/api/ingestion.md`](../../docs/api/ingestion.md).
- **Field limits** (the reporter truncates before sending; the server validates): `title` ≤ 1 KB, `errorMessage` ≤ 4 KB, `stackTrace` ≤ 32 KB.
- **Errors:** `400 VALIDATION_ERROR`, `401 INVALID_API_KEY`, `404 RUN_NOT_FOUND` (also returned for runs in another project), `409 RUN_COMPLETED`, `413 PAYLOAD_TOO_LARGE`, `429 RATE_LIMITED` / `429 QUOTA_EXCEEDED`.
- **Stale runs:** a scheduled reaper marks `RUNNING` runs with no activity for 30 minutes as `TIMED_OUT`.
- **CI safety:** the reporter never changes the test runner's exit code because of a TestPulse error (network, 4xx, 5xx, quota). It logs a single warning and continues.

### 4.3 Real-Time Fan-out

```text
API handler / BullMQ worker
   └─ (after DB commit) RealtimePublisher.emit(event)        // wraps @socket.io/redis-emitter, Zod-validates
         └─ Redis
               └─ @socket.io/redis-adapter on EVERY gateway instance
                     └─ delivers only to that instance's local sockets in the room
```

- API route handlers and workers never hold a Socket.IO server reference. They emit through `RealtimePublisher`.
- **Anti-pattern (forbidden):** gateway instances subscribing to a custom Redis channel and calling `io.to(room).emit(...)`. With the Redis adapter, every instance would re-broadcast to the whole cluster, and clients would receive the event N times.
- Socket.IO connection-state recovery is not available with the classic Redis adapter. Catch-up after reconnect is done by refetching (P05-S06).

### 4.4 Deployment Profiles

TestPulse runs on the **free profile** for the whole of product development (Phases 02–10, up to P10-S05). In P10-S06, a decision gate chooses the paid production setup (D-14). Application code supports both profiles through configuration only; there are no code forks.

| Concern | Free profile (development → P10-S05) | Paid profile (P10-S06 onward, provider decided then) |
| :--- | :--- | :--- |
| Web (Next.js) | Vercel Hobby (non-commercial use only; fine while nobody pays) | Vercel Pro or equivalent commercial host |
| API + gateway | One Render free web service (sleeps after ~15 min idle; ~1 min cold start) | Always-on instances (N ≥ 2) with sticky sessions or websocket-only transport |
| Workers | Run **in-process** in the API service (`RUN_WORKERS_IN_PROCESS=true`) | Separate worker service (`node dist/worker.js`) |
| PostgreSQL | Neon free (≈0.5 GB per project; autosuspend) | Neon paid (PITR backups) or equivalent |
| Redis | Render Key Value free (≈25 MB, no persistence, internal network) | Persistent, fixed-price Redis co-located with the API |
| REST + cookies | Next.js rewrites proxy `/api/:path*` → API, so cookies are first-party on the web origin | `api.<domain>` on the same registrable domain (custom domain) |
| WebSocket | Browser connects directly to the Render URL with a ticket; `transports: ["websocket"]` | Same, on `api.<domain>` |
| Email | Console transport, or Resend free (sends only to verified/owner addresses until a domain is verified) | Resend/SMTP with a verified sending domain (SPF, DKIM, DMARC) |
| Errors / uptime | Sentry free; optional scheduled GitHub Actions ping | Sentry paid as needed; uptime monitoring and alerting |
| CI | GitHub Actions (service containers) | Same |

**Rules for the free period:**
1. **Design for sleep.** Scheduled jobs (SLA monitor, run reaper, retention, aggregation) must be *catch-up safe*. They select work by state and timestamps (e.g. `slaDueAt <= now AND warnedAt IS NULL`), not by "what changed since the last tick". Repeatable jobs are re-registered idempotently at startup, because free Redis is not persistent.
2. **Cold starts are expected.** The reporter allows a long first-request timeout (60 s) and retries. The web app shows a "waking up the server" state instead of an error.
3. **Performance targets (§10) are verified locally or in CI service containers** during the free period. Hosted free-tier numbers are not acceptance evidence; they are re-verified on paid infrastructure in P10-S06.
4. **No real customers or commercial use** on the free profile. Use synthetic or demo data only, and treat the Neon free storage cap as a hard limit (short retention on staging).
5. **Rate limiting behind the proxy:** with `trustProxy` configured for the web host, derive the client IP from `x-forwarded-for`. Ingestion limits rely on API keys, not IPs.
6. Free-tier terms change. Verify current limits when executing P02-S05, and record them in `docs/ops/free-tier-deployment.md`.

---

## 5. Domain Model & Multi-Tenant Data Schema

### 5.1 Core Database Entities

Every tenant-owned table carries `projectId` and/or `orgId` directly (denormalized where needed), so that every query can be scoped without joins. Timestamps (`createdAt`, `updatedAt`) are implied.

**Identity & tenancy**

| Entity | Key fields | Introduced |
| :--- | :--- | :--- |
| `User` | `id`, `email` (unique, lower-cased), `emailVerifiedAt?`, `passwordHash?` (argon2id), `name`, `avatarUrl?`, `deletedAt?` | P03-S01 |
| `OAuthAccount` | `id`, `userId`, `provider` [GOOGLE, GITHUB], `providerAccountId`; `@@unique([provider, providerAccountId])` | P03-S02 |
| `Session` | `id`, `userId`, `familyId`, `refreshTokenHash`, `expiresAt`, `revokedAt?`, `replacedById?`, `userAgent?` | P03-S01 |
| `VerificationToken` | `id`, `userId`, `type` [EMAIL_VERIFY, PASSWORD_RESET], `tokenHash`, `expiresAt`, `usedAt?` | P03-S01 |
| `Organization` | `id`, `name`, `slug` (unique), `planTier` [FREE, PRO, ENTERPRISE] | P03-S03 |
| `OrgMember` | `id`, `orgId`, `userId`, `role` [OWNER, ADMIN, MEMBER, VIEWER]; `@@unique([orgId, userId])` | P03-S03 |
| `Invitation` | `id`, `orgId`, `email`, `role`, `tokenHash`, `invitedById`, `expiresAt`, `acceptedAt?`, `revokedAt?` | P03-S04 |
| `Project` | `id`, `orgId`, `name`, `slug`, `description?`, `defaultBranch`, `runCounter`, settings: `slaDays` (14), `retentionDays`, `flakyWindow` (10), `flakyThreshold` (3), `trackedBranches[]`; `@@unique([orgId, slug])` | P03-S03 |
| `ApiKey` | `id`, `orgId`, `projectId`, `name`, `prefix`, `keyHash` (unique), `createdById`, `lastUsedAt?`, `expiresAt?`, `revokedAt?` | P03-S05 |
| `AuditEvent` | `id`, `orgId`, `projectId?`, `actorUserId?`, `actorApiKeyId?`, `action`, `targetType`, `targetId`, `metadata` | P03-S06 |

**Test execution**

| Entity | Key fields | Introduced |
| :--- | :--- | :--- |
| `TestSuite` | `id`, `projectId`, `filePath` (POSIX-normalized), `name`; `@@unique([projectId, filePath])` | P04-S01 |
| `TestCase` | `id`, `projectId`, `suiteId`, `identifier` (fingerprint, see P04-S03), `title`, `titlePath[]`, `runnerProject?`, `tags[]` (from runner), `labels[]` (user-applied), `lastStatus`, `lastSeenAt`, `flakyState` [STABLE, SUSPECTED, FLAKY], `flakyScore` (0–100), `lastFlakyAt?`, `isQuarantined` (denormalized, written in the same transaction as quarantine transitions); `@@unique([projectId, identifier])` | P04-S01 / P06-S01 |
| `TestRun` | `id`, `projectId`, `runNumber`, `externalRunId`, `status` [RUNNING, PASSED, FAILED, CANCELLED, TIMED_OUT], `branch`, `commitSha`, `ciProvider`, `ciJobUrl?`, `environment?`, `runner`, `reporterVersion`, `shardTotal`, `shardsCompleted`, `expectedTestCount?`, `totalCount`, `passedCount`, `failedCount`, `skippedCount`, `flakyCount`, `quarantinedFailedCount`, `quarantineUnblocked`, `startedAt`, `finishedAt?`, `lastActivityAt`, `durationMs?`; `@@unique([projectId, runNumber])`, `@@unique([projectId, externalRunId])` | P04-S01 |
| `TestResult` | `id`, `projectId`, `runId`, `testCaseId`, `status` [PASSED, FAILED, SKIPPED, FLAKY], `retryCount`, `durationMs`, `errorMessage?`, `stackTrace?`, `shardIndex`, `createdAt`; `@@unique([runId, testCaseId])` | P04-S01 |

`TestResult.status = FLAKY` means the test failed at least once and then passed on retry within the same run. A run's final status is `CANCELLED` if any shard was interrupted; otherwise `FAILED` if any result is `FAILED` (failures of quarantined tests count, and are reported separately via `quarantinedFailedCount`; D-16); otherwise `PASSED`. Flaky results do not fail a run.

**Triage & collaboration**

| Entity | Key fields | Introduced |
| :--- | :--- | :--- |
| `QuarantineRecord` | `id`, `projectId`, `testCaseId`, `status` [ACTIVE, INVESTIGATING, RESOLVED, DISMISSED], `reason`, `assigneeId?`, `createdById`, `slaDueAt`, `warnedAt?`, `escalatedAt?`, `overdueFlaggedAt?`, `closedAt?`, `closingNote?`. At most one open (ACTIVE/INVESTIGATING) record per test case (partial unique index). | P06-S02 |
| `QuarantineTransition` | `id`, `projectId`, `quarantineId`, `fromStatus?`, `toStatus`, `actorUserId?` (null = system), `note?` | P06-S02 |
| `Annotation` | `id`, `projectId`, `testCaseId`, `authorId`, `body` (plain text / restricted Markdown), `mentionedUserIds[]`, `editedAt?`, `deletedAt?` | P06-S03 |

**Notifications, integrations & analytics**

| Entity | Key fields | Introduced |
| :--- | :--- | :--- |
| `Notification` | `id`, `orgId`, `projectId?`, `userId`, `type`, `title`, `body`, `linkPath`, `readAt?` | P07-S01 |
| `NotificationPreference` | `id`, `userId`, `projectId?`, `eventType`, `channels[]` [IN_APP, EMAIL] | P07-S03 |
| `Webhook` | `id`, `projectId`, `url`, `secretCiphertext` (encrypted at rest, because the secret is needed to sign), `events[]`, `active`, `createdById` | P07-S05 |
| `WebhookDelivery` | `id`, `projectId`, `webhookId`, `eventId`, `attempt`, `status`, `responseCode?`, `latencyMs?`, `error?` | P07-S05 |
| `ProjectDailyMetric` / `TestCaseDailyMetric` | `projectId`, `date` (UTC), counts, pass rate, avg/p95 duration, flaky count | P08-S01 |

### 5.2 Indexing & Isolation Rules

- `TestRun`: `@@index([projectId, createdAt])`, `@@index([projectId, branch, createdAt])`, `@@index([status, lastActivityAt])` (reaper).
- `TestResult`: `@@index([runId, status])`, `@@index([testCaseId, createdAt])` (history), `@@index([projectId, createdAt])` (retention).
- `TestCase`: `@@index([projectId, flakyState])`, `@@index([projectId, isQuarantined])`.
- `QuarantineRecord`: `@@index([projectId, status])`, `@@index([status, slaDueAt])` (SLA job).
- `Notification`: `@@index([userId, readAt, createdAt])`.
- Global (non-tenant) tables: `User`, `OAuthAccount`, `Session`, `VerificationToken`. Every other table is tenant-owned.
- `TestResult` is the high-volume table. Monitor its size in P04-S06 and P10-S03, and evaluate time-based partitioning when it passes ~50M rows (post-MVP).

---

## 6. Event Registry

### 6.1 Socket.IO events (server → client)

All events are defined in `@testpulse/shared/src/events/` with Zod schemas and use one envelope: `{ eventId, type, version: 1, occurredAt, orgId, projectId?, payload }`. Payloads are lean: IDs, status, and counters. Clients fetch details (stack traces, comment bodies) over REST.

| Socket.IO event | Room | Payload | Emitted when |
| :--- | :--- | :--- | :--- |
| `run:started` | `project:{projectId}` | `runId`, `runNumber`, `branch`, `commitSha`, `startedAt` | A run is created (P04-S02) |
| `run:progress` | `project:{projectId}` | `runId`, counters, `results[]` of `{ testCaseId, title, status, durationMs }` (≤ 1,000 per event) | A result batch commits (P04-S02) |
| `run:completed` | `project:{projectId}` | `runId`, `status`, counters, `durationMs` | All shards complete, or the reaper times the run out |
| `testcase:flaky-changed` | `project:{projectId}` | `testCaseId`, `flakyState`, `flakyScore` | Flaky analysis changes the state (P06-S01) |
| `quarantine:changed` | `project:{projectId}` | `quarantineId`, `testCaseId`, `status`, `assigneeId?` | Any quarantine transition (P06-S02) |
| `annotation:created` | `project:{projectId}` | `annotationId`, `testCaseId`, `authorId` | Comment added (P06-S03) |
| `notification:new` | `user:{userId}` | `notificationId`, `type`, `title` | Notification created (P07-S01) |

Handshake: the client obtains a single-use ticket from `POST /api/v1/realtime/ticket` (cookie-authenticated, same origin) and connects with `auth: { ticket }`. The gateway redeems the ticket atomically from Redis.

Client → server: `join:project { projectId }` and `leave:project { projectId }`, each with an ack `{ ok: true } | { ok: false, code }`. The server re-checks membership on every join. When a member is removed or downgraded, the server evicts that user's sockets from the org's project rooms and sends the control event `access:revoked`. The full dictionary is in [`docs/api/realtime-events.md`](../../docs/api/realtime-events.md).

### 6.2 Domain events (internal, BullMQ `domain-events` queue)

Producers (Phase 04–06) enqueue domain events **after commit**. Consumers (Phase 07: notification router, email, webhooks) subscribe later without changes to producers.

`run.failed`, `run.recovered`, `test.new_failure`, `test.flaky_detected`, `quarantine.created`, `quarantine.sla_warning` (80%), `quarantine.sla_escalated` (100%), `quarantine.overdue` (200%), `quarantine.closed`, `annotation.mentioned`, `member.invited`.

---

## 7. Authorization & Tenant Isolation

### 7.1 Roles

Roles are **organization-level** and apply to every project in the org. There are no per-project roles in v1.

| Action | Owner | Admin | Member | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| Delete organization / transfer ownership | ✅ | ❌ | ❌ | ❌ |
| Edit organization settings | ✅ | ✅ | ❌ | ❌ |
| Invite / remove members, change roles (never to or from Owner) | ✅ | ✅ | ❌ | ❌ |
| Create / delete projects, edit project settings (SLA, retention, flaky thresholds) | ✅ | ✅ | ❌ | ❌ |
| Create / revoke API keys, manage webhooks | ✅ | ✅ | ❌ | ❌ |
| Quarantine, assign, transition, resolve / dismiss (incl. bulk) | ✅ | ✅ | ✅ | ❌ |
| Comment, @mention, apply labels | ✅ | ✅ | ✅ | ❌ |
| View runs, test cases, quarantines, analytics; export CSV/JSON | ✅ | ✅ | ✅ | ✅ |
| Manage own profile and notification preferences | ✅ | ✅ | ✅ | ✅ |

API keys carry no role. They may only call `/api/v1/ingest/*` for their own project.

### 7.2 Isolation rules

1. **Scoped routes.** User-facing resource routes are nested under `/api/v1/orgs/:orgId/...` or `/api/v1/projects/:projectId/...`. One preHandler resolves `project → org → membership → role` into `request.tenantContext`. Handlers read tenant IDs only from `tenantContext`.
2. **Scoped data access.** Apps never use a raw `PrismaClient`. `@testpulse/db` exports `createTenantDb(ctx)` (injects and verifies `projectId`/`orgId` on every operation) and an explicitly named `systemDb` for workers, migrations, and auth tables. ESLint forbids importing `@prisma/client` outside `packages/db`.
3. **Lookups by ID include the tenant.** Use `findFirst({ where: { id, projectId } })`. Never use `findUnique({ where: { id } })` on tenant data.
4. **404 for cross-tenant, 403 for insufficient role.** A resource that exists in another tenant returns `404 NOT_FOUND`, so its existence is not disclosed. An authenticated member who lacks the role for an action gets `403 FORBIDDEN`.
5. **Real-time rooms** require the same membership check as REST (see §6.1).
6. **Background jobs** carry `orgId`/`projectId` in their Zod-validated job data and open a tenant-scoped client for that context.

---

## 8. Plans & Limits

v1 has **no payment flow**. `Organization.planTier` defaults to `FREE` and is changed by an operator script. Tiers differ by **quotas only**: every MVP feature is available on every tier. Limits live in `@testpulse/shared/src/plans.ts` (single source for API enforcement and UI copy).

| Limit | Free | Pro ($29/seat/mo — GTM placeholder) | Enterprise |
| :--- | :--- | :--- | :--- |
| Projects per org | 2 | Unlimited | Unlimited |
| Members per org (incl. pending invites) | 3 | 25 | Unlimited |
| Test runs per org per calendar month (UTC) | 500 | 10,000 | Unlimited (fair use) |
| Maximum history retention | 7 days | 90 days | 365 days |

- Effective retention = `min(project.retentionDays, plan maximum)`.
- **Over quota:** ingestion returns `429 QUOTA_EXCEEDED` (the reporter warns and the CI run is unaffected). The dashboard shows a banner. Creating a project or inviting a member beyond the limit returns `403 PLAN_LIMIT_REACHED`, and the UI shows an upgrade modal whose CTA is "Contact us / join the Pro waitlist".

---

## 9. Implementation Roadmap (11 phases, 60 sprints)

- **Phase 01: Product & Architecture Foundation** (5 sprints) — Requirements, IA, system design and ADRs, security model, testing strategy.
- **Phase 02: Project Bootstrap & DevOps** (6 sprints) — Turborepo, Next.js, Fastify, Prisma, Redis/BullMQ skeleton, tooling, CI/CD, **design-system foundation & app shell**.
- **Phase 03: Authentication & Multi-Tenancy** (6 sprints) — API-owned auth (credentials + OAuth), org/project CRUD, invitations, RBAC, API keys, isolation audit.
- **Phase 04: Test Run Ingestion & Data Model** (6 sprints) — Schema, incremental ingestion API, fingerprinting, query APIs, `@testpulse/reporter`, quotas, and retention.
- **Phase 05: Real-Time Dashboard** (6 sprints) — Socket.IO gateway, client hooks, live run UI, run list, test detail, resilience.
- **Phase 06: Flaky Test Detection & Quarantine** (5 sprints) — Flaky engine, quarantine state machine, annotations, quarantine dashboard, SLA escalation.
- **Phase 07: Notifications & Integrations** (5 sprints) — In-app notifications, email, preferences/digests, GitHub CI reporting, webhooks.
- **Phase 08: Analytics & Reporting** (4 sprints) — Aggregation pipeline, trend charts, leaderboards, MTTR, branch comparison, exports.
- **Phase 09: UX Polish & Accessibility** (5 sprints) — Design-system consolidation, theme QA, motion, states, WCAG 2.1 AA audit.
- **Phase 10: Quality Engineering & Release** (7 sprints) — Coverage audit, E2E hardening, load tests, security audit, free-tier staging validation, **paid production migration (decision gate)**, **v1.0 production release (private beta)**.
- **Phase 11: Landing Page, Docs & Go-to-Market** (5 sprints) — Marketing site, docs portal, CI guides and API reference, SEO/analytics, **public launch**.

---

## 10. Non-Functional Targets

These are the single source for performance and quality numbers. Sprint files reference them instead of restating different values. During the free-tier period, performance targets are measured locally or in CI service containers, then re-verified on paid infrastructure in P10-S06 (§4.4).

| Area | Target | Verified in |
| :--- | :--- | :--- |
| Dashboard initial load | LCP < 2.0 s (p75, broadband/4G) | P10-S03 |
| Marketing landing page | LCP < 1.5 s; Lighthouse Performance, Accessibility, SEO ≥ 95 | P11-S01 |
| Real-time latency | p95 < 200 ms from Redis publish to browser render | P05-S06, P10-S03 |
| WebSocket concurrency | 1,000 concurrent connections per gateway instance within the latency target (P05-S06 smoke test: 100) | P10-S03 |
| Ingestion throughput | 10,000 results (as batches of ≤ 1,000) persisted in < 5 s | P04-S06, P10-S03 |
| REST API latency | p95 < 300 ms at 1,000 concurrent requests on read endpoints | P10-S03 |
| Uptime | 99.9% for the ingestion API | Post-launch monitoring |
| Accessibility | WCAG 2.1 AA; zero axe-core critical/serious violations | Every UI sprint, audited in P09-S05 |
| Coverage | ≥ 80% lines on `packages/shared`, `packages/db`, and `apps/api` services; critical journeys covered by E2E | Ratcheted in CI from P02-S05, audited in P10-S01 |
| CI safety | The reporter never fails a customer's CI because of TestPulse | P04-S05 |
| Cross-platform | All scripts run on Windows PowerShell and POSIX shells | Every sprint |

---

## 11. Decision Log

Decisions resolved during the planning review (2026-10). Each will be written up as an ADR in P01-S03/P01-S04.

| ID | Decision | Rationale |
| :--- | :--- | :--- |
| D-01 | **Auth is owned by the API (Fastify)**, not Auth.js/Clerk. Short-lived access JWT (15 min) plus a rotating refresh token, both in first-party `HttpOnly` cookies (same-origin proxy in the free profile, same-site subdomains in the paid profile). Sockets use single-use tickets. OAuth callbacks are handled by the API. | The REST API, Socket.IO gateway, and workers all need one token format. Next.js-owned sessions would split auth across two deployments. |
| D-02 | **Incremental ingestion** (start / results batches / complete), with the project derived from the API key and idempotency on `externalRunId` + `(runId, testCaseId)`. | A single end-of-run POST makes "live" streaming impossible, and parallel CI shards need to join one run. |
| D-03 | **Real-time fan-out uses `@socket.io/redis-emitter` → `@socket.io/redis-adapter`.** | Prevents N× duplicate broadcasts and lets workers emit without a Socket.IO server. |
| D-04 | **Tenant isolation** by `projectId`/`orgId` on every tenant table, plus a tenant-scoped DB client, nested routes, and a 404 policy for cross-tenant access. | The original extension example was a no-op placeholder, and several routes lacked tenant context. |
| D-05 | **Plans are quota-only in v1**, with no payment flow and no feature gating. | Billing is out of scope, and two pricing tables in the original plan contradicted each other. |
| D-06 | **Members can triage** (quarantine, assign, resolve). Admin+ manages settings, keys, and members. | The primary persona (SDET) is usually a Member; Admin-only quarantine contradicted "collaborative triage". |
| D-07 | **Reporter v1 = Playwright + Vitest.** GitHub reporting runs CI-side with `GITHUB_TOKEN`. | Keeps Phase 04/07 achievable, and avoids a server-side GitHub App and its secrets. |
| D-08 | **Design-system foundation moves to P02-S06.** Phase 09 becomes consolidation, QA, and audit. | Building Phases 03–08 UI before tokens and theming exist guarantees rework. |
| D-09 | **Test infrastructure:** real PostgreSQL with schema-per-worker isolation; `ioredis-mock` for unit tests only; BullMQ and Socket.IO adapter contract tests against real Redis in CI. | `ioredis-mock` cannot run BullMQ's Lua scripts. Transaction-rollback isolation conflicts with Prisma interactive transactions. |
| D-10 | **Node 24 LTS, Fastify 5, npm workspaces, ESLint flat config, Turborepo 2 `tasks`.** | Node 20 and Fastify 4 are EOL, and every doc already uses `npm run`. |
| D-11 | **P10-S07 ships v1.0 to production as a private beta**, after the P10-S06 paid migration. The public launch is P11-S05. | The original plan launched publicly before the landing page and docs existed. |
| D-12 | **Notifications are decoupled through domain events** (§6.2). | Phase 06 needs to notify users before the Phase 07 notification system exists. |
| D-13 | **A minimal transactional `Mailer` ships in P03-S01.** | Email verification, password reset, and invitations are needed in Phase 03; P07-S02 extends it. |
| D-14 | **Free-tier hosting until feature-complete** (§4.4). A dedicated sprint (P10-S06) decides and executes the paid production setup before any real users are onboarded. | Product owner decision (2026-10): no cloud spend during development. The free profile forces a same-origin proxy, ticket-based socket auth, in-process workers, and catch-up-safe jobs; all of these also work in the paid profile. |
| D-16 | **Quarantine is advisory by default; opt-in non-blocking mode** in the reporter (Playwright in v1). Failures stay `FAILED` and are labeled "known" (closes Q1, PRD §6). | Never silently turn red builds green; teams can opt in per pipeline. |
| D-17 | **Dependency baseline per ADR-004** (closes Q2). | npm on 2026-10-02 showed incompatible or prerelease `latest` tags (TypeScript 7, Prisma 8 RC). |
| D-18 | **No PostgreSQL RLS in v1**; five-layer isolation per ADR-006 (closes Q4). | RLS with pooled Prisma connections adds risk and latency on the hot path; app-level layers are testable in CI. |
| D-19 | **Resend behind the `Mailer` interface**; console/file transport in dev and test (closes Q5). | Simple API and a free tier; swappable. |
| D-20 | **Renamed or moved tests are new test cases** (closes Q6, ADR-007). | Stable fingerprints over heuristics; manual merge is post-MVP. |
| D-15 | **Traceability by ID.** Features have `FR-*` IDs (`docs/product/feature-catalog.md`) and test scenarios have `SC-*` IDs (`docs/testing/scenario-catalog.md`). Tests, PRs, and sprint catalogs reference them. | Keeps functionality and its tests from drifting apart across 60 sprints and many agent sessions. |

---

## 12. Open Decisions

| ID | Question | Owner sprint | Recommendation |
| :--- | :--- | :--- | :--- |
| ~~Q1~~ | ~~Does quarantine affect CI outcomes?~~ **Closed → D-16** | P01-S01 | Advisory by default. The reporter can optionally mark failures of quarantined tests as non-blocking (`quarantineMode: "non-blocking"`) using `GET /api/v1/ingest/quarantined-tests`. Playwright reporters can override the final status in `onEnd`; confirm Vitest feasibility in P04-S05. |
| ~~Q2~~ | ~~Exact dependency majors~~ **Closed → D-17 / ADR-004** | P01-S03 | Choose the current stable majors at kickoff; do not start on a superseded major. |
| Q3 | Paid production hosting & Redis provider (free profile is fixed by D-14) | P10-S06 | BullMQ polling and adapter traffic make per-command pricing expensive. Prefer fixed-price Redis co-located with the API. Candidates: Render paid, Railway, or Fly.io; decide on real usage data. |
| ~~Q4~~ | ~~PostgreSQL RLS~~ **Closed → D-18 / ADR-006** | P01-S04 | Not required for v1 if D-04 controls and isolation tests pass. Revisit after launch. |
| ~~Q5~~ | ~~Email provider~~ **Closed → D-19** (sending domain is verified in P10-S06) | P01-S03 | Resend, behind the `Mailer` interface. |
| ~~Q6~~ | ~~Test identity on rename/move~~ **Closed → D-20 / ADR-007** | P01-S03 | Treat it as a new test case in v1 (documented limitation). Manual merge is post-MVP. |
