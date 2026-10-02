# Master Plan: TestPulse — Real-Time Test Execution Dashboard SaaS

**Project codename:** `TestPulse`\
**Target platform:** Web SaaS (responsive, cloud-native)\
**Development approach:** AI-assisted, agent-first development with Google Antigravity\
**Primary developer stack:** Next.js 15 + TypeScript + PostgreSQL + Redis\
**Real-time engine:** WebSockets (Socket.IO) + CRDT for collaborative annotations\
**Initial release:** MVP — live test run streaming, flaky-test annotations, team workspaces\
**Future releases:** Billing, CI integrations marketplace, mobile companion, AI-powered failure diagnosis

---

## 1. Executive Vision

Build a production-grade SaaS application that lets QA teams, SDETs, and engineering managers **watch test runs in real-time**, annotate flaky tests collaboratively, manage quarantine lifecycles, and receive intelligent alerts — all from a single premium dashboard.

TestPulse solves a pain point every engineering team with >50 tests faces: **"What broke? Is it flaky? Who's looking at it?"**

### Why TestPulse?

- **Existing tools are fragmented.** Allure, ReportPortal, and Grafana dashboards show results *after* the run. TestPulse shows them *live*.
- **Flaky test management is ad-hoc.** Most teams use spreadsheets or Slack threads. TestPulse makes quarantine a first-class workflow.
- **No one owns test health.** TestPulse introduces team-based accountability with clear ownership, SLA timers, and escalation policies.

### The first release (MVP) should support:

- User authentication (email + OAuth via Google/GitHub)
- Organization workspaces with role-based access (Owner, Admin, Member, Viewer)
- Project creation and management within organizations
- Real-time test run streaming (WebSocket-powered live dashboard)
- Test result ingestion via REST API and CI reporter plugins
- Individual test case detail view with history timeline
- Flaky test detection and annotation (manual + heuristic-based)
- Quarantine lifecycle management (quarantine -> investigate -> resolve/dismiss)
- Real-time collaborative annotations (comments, tags, assignments)
- Notification system (in-app + email for quarantine escalations)
- Dashboard analytics (pass rate trends, MTTR for flaky tests, top failing tests)
- Responsive web UI with dark/light themes
- API key management for CI integrations
- Comprehensive E2E, integration, and unit test suites
- GitHub Actions CI/CD pipelines
- Production deployment on Vercel (frontend) + Railway/Render (backend)

### The architecture should deliberately leave room for:

- Stripe billing and subscription tiers (Free / Pro / Enterprise)
- CI integrations marketplace (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- AI-powered failure diagnosis and auto-triage
- Slack/Teams/Discord webhook integrations
- Mobile companion app (React Native)
- Custom dashboards and widget builder
- SSO/SAML for enterprise customers
- Audit logging and compliance features
- Self-hosted/on-premise deployment option
- Public status page for test health

Do **not** build these future features in v1 unless the core product is already stable.

---

## 2. How Antigravity Should Be Used

Google Antigravity is an agent-first development environment. The key principle for this project:

> Do not ask one AI agent to "build the SaaS."

Instead:

> Give the agent a product specification, architecture rules, acceptance criteria, and small verifiable milestones.

The human remains the architect and final reviewer. Antigravity becomes the engineering team.

Recommended agent roles:

| Agent                    | Responsibility                                           |
|--------------------------|----------------------------------------------------------|
| Product Architect        | Requirements, architecture, roadmap                      |
| Backend Engineer         | API design, database, WebSockets, auth                   |
| Frontend Engineer        | React components, state management, real-time UI         |
| Real-Time Engineer       | WebSocket infrastructure, CRDT sync, event streaming     |
| Data Engineer            | Analytics pipeline, aggregation queries                  |
| DevOps Engineer          | CI/CD, deployment, monitoring, infrastructure            |
| Test Engineer            | Unit/integration/E2E testing, test data factories        |
| Security Engineer        | Auth, RBAC, API key management, rate limiting            |
| UX/Design Engineer       | Design system, accessibility, responsive layouts         |
| Growth Engineer          | Onboarding flows, documentation, landing page            |
| Reviewer Agent           | Code review and architecture consistency                 |

Do not allow multiple agents to modify the same files simultaneously unless the work is explicitly isolated.

---

## 3. Recommended Technology Stack

### 3.1 Frontend Framework

**Recommended: Next.js 15 (App Router)**

- Next.js 15 with App Router and Server Components
- React 19 + TypeScript (strict mode)
- SSR for marketing/landing pages, client components for real-time dashboard

### 3.2 Styling & UI

- Tailwind CSS v4 with custom design system
- Radix UI primitives for accessible components
- Framer Motion for micro-animations
- Recharts or Nivo for data visualization

### 3.3 Backend & API

- Node.js with Fastify (standalone API server)
- tRPC or REST with Zod validation
- Socket.IO for WebSocket connections
- BullMQ for background job processing

### 3.4 Database & Storage

- PostgreSQL 16 (primary relational store)
- Prisma ORM (type-safe queries, migrations)
- Redis (real-time pub/sub, session cache, job queues)
- S3-compatible storage for test artifacts (screenshots, logs)

### 3.5 Authentication & Authorization

- Auth.js (NextAuth v5) or Clerk
- JWT + refresh token pattern
- Role-based access control (Owner > Admin > Member > Viewer)
- API key authentication for CI integrations

### 3.6 Real-Time Infrastructure

```text
CI Runner
    |
    v
TestPulse Ingestion API (REST)
    |
    v
PostgreSQL (persist) + Redis Pub/Sub (broadcast)
    |
    v
Socket.IO Server
    |
    v
Connected Browser Clients (live dashboard)
```

### 3.7 Testing

- Vitest (unit + integration)
- Playwright (E2E browser tests)
- Supertest (API integration tests)
- MSW (Mock Service Worker for frontend API mocking)
- Faker.js (test data generation)

### 3.8 DevOps & Deployment

- Vercel (Next.js frontend)
- Railway or Render (Node.js API + WebSocket server)
- Neon or Supabase (managed PostgreSQL)
- Upstash (managed Redis)
- GitHub Actions (CI/CD)
- Sentry (error tracking)

---

## 4. Architecture Overview

```text
                        TestPulse Architecture
                               |
        +----------------------+----------------------+
        |                      |                      |
   Next.js Frontend      API Server            WebSocket Server
   (Vercel)              (Railway)             (Railway)
        |                      |                      |
        +----------------------+----------------------+
                               |
                    +----------+----------+
                    |          |          |
               PostgreSQL    Redis     S3/R2
               (Neon)     (Upstash)  (Cloudflare)
```

### Data Flow: Test Run Ingestion

```text
CI Pipeline (GitHub Actions, etc.)
        |
        | POST /api/v1/runs (API Key auth)
        v
  Ingestion API
        |
        +---> PostgreSQL (persist run + results)
        |
        +---> Redis PUB (channel: run:{runId})
                |
                v
          Socket.IO Server
                |
                v
          Connected Clients (real-time update)
```

### Data Flow: Flaky Test Annotation

```text
User Browser
    |
    | WebSocket: annotate(testId, comment)
    v
Socket.IO Server
    |
    +---> PostgreSQL (persist annotation)
    |
    +---> Redis PUB (channel: project:{projectId})
            |
            v
      All Connected Team Members (real-time sync)
```

---

## 5. Domain Model

### Core Entities

```text
Organization
  |
  +--- Members (User + Role)
  |
  +--- Projects
        |
        +--- API Keys
        |
        +--- Test Suites
        |     |
        |     +--- Test Cases
        |           |
        |           +--- Test History (per run)
        |           |
        |           +--- Annotations (comments, tags)
        |           |
        |           +--- Quarantine Records
        |
        +--- Test Runs
              |
              +--- Run Results (per test case)
              |
              +--- Run Metadata (CI provider, branch, commit, duration)
```

### Key Business Rules

1. A test case is marked "flaky" if it has >=3 alternating pass/fail results in the last 10 runs.
2. Quarantined tests are excluded from blocking CI pipelines but remain visible with a quarantine badge.
3. Quarantine records have a 14-day SLA. If unresolved, they escalate to the project admin.
4. Only Admin+ roles can quarantine or un-quarantine tests.
5. API keys are scoped to a project and can only ingest data, never read org-level information.

---

## 6. Monetization & Pricing Strategy

### Pricing Tiers

| Feature                       | Free         | Pro ($29/mo/seat) | Enterprise (Custom) |
|-------------------------------|--------------|--------------------|--------------------|
| Projects                      | 2            | Unlimited          | Unlimited          |
| Test runs / month             | 500          | 10,000             | Unlimited          |
| Test case history retention   | 7 days       | 90 days            | Custom             |
| Team members                  | 3            | 25                 | Unlimited          |
| Real-time dashboard           | Yes          | Yes                | Yes                |
| Flaky test detection          | Manual only  | Heuristic + Manual | AI-powered         |
| Quarantine management         | Basic        | Full lifecycle     | Custom policies    |
| Notifications                 | In-app       | Email + Slack      | Custom webhooks    |
| CI integrations               | GitHub only  | All supported      | Custom + on-prem   |
| SSO / SAML                    | No           | No                 | Yes                |
| Priority support              | Community    | Email (24h SLA)    | Dedicated (1h SLA) |

### Revenue Targets

- **Month 1-3:** 0 revenue (free tier only, build user base)
- **Month 4-6:** $500-2,000 MRR (early Pro adopters)
- **Month 7-12:** $5,000-15,000 MRR (growth phase)
- **Year 2:** $50,000+ MRR (enterprise contracts)

---

## 7. Go-to-Market Strategy

### Target Customers (Prioritized)

1. **SDET teams at mid-size companies (50-500 engineers)**
2. **QA leads and engineering managers**
3. **Open-source project maintainers** (free tier, word-of-mouth)
4. **DevOps/Platform teams** (own CI infrastructure)

### Acquisition Channels

| Channel                    | Strategy                                                 |
|----------------------------|----------------------------------------------------------|
| Content marketing          | Blog posts: "How we reduced flaky tests by 80%"         |
| Developer communities      | Dev.to, Reddit, HackerNews launches                     |
| Open-source reporters      | Free npm/PyPI CI reporter packages drive adoption        |
| Conference talks           | SeleniumConf, Playwright summit, testing meetups         |
| Product Hunt launch        | Timed with Pro tier availability                         |
| Free tier virality         | "Powered by TestPulse" badge on public dashboards        |

### Competitive Differentiators

| Competitor       | TestPulse Advantage                                      |
|------------------|----------------------------------------------------------|
| Allure           | Real-time (not post-hoc), collaborative annotations      |
| ReportPortal     | Modern UX, simpler setup, lower cost                     |
| Buildkite Analytics | Framework-agnostic, richer flaky management           |
| Datadog CI       | Purpose-built for test health, not general monitoring    |

---

## 8. Phase Breakdown

```text
Phase 01: Product & Architecture Foundation     (5 sprints)
Phase 02: Project Bootstrap & DevOps            (5 sprints)
Phase 03: Authentication & Multi-Tenancy        (6 sprints)
Phase 04: Test Run Ingestion & Data Model       (6 sprints)
Phase 05: Real-Time Dashboard                   (6 sprints)
Phase 06: Flaky Test Detection & Quarantine     (5 sprints)
Phase 07: Notifications & Integrations          (5 sprints)
Phase 08: Analytics & Reporting                 (4 sprints)
Phase 09: UX Polish & Accessibility             (5 sprints)
Phase 10: Quality Engineering & Release         (6 sprints)
Phase 11: Landing Page, Docs & Go-to-Market     (5 sprints)
                                          Total: 58 sprints
```

---

## 9. Non-Functional Requirements

### Performance
- Dashboard initial load: < 2 seconds (LCP)
- WebSocket event latency: < 200ms (server to client)
- API response time: < 300ms (p95)
- Support 100 concurrent WebSocket connections per project

### Security
- OWASP Top 10 compliance
- API key rotation support
- Rate limiting on all public endpoints
- Row-level security for tenant isolation
- Secrets never committed to version control

### Reliability
- 99.9% uptime SLA (Pro tier)
- Zero data loss on test result ingestion
- Graceful degradation when WebSocket disconnects
- Automatic reconnection with state recovery

---

## 10. What NOT to Build Initially

- Billing / Stripe integration
- AI-powered test failure diagnosis
- Mobile companion app
- Self-hosted / on-premise option
- SSO / SAML authentication
- Audit logging
- Custom dashboard builder
- Video/screenshot artifact viewer
- Multi-region deployment
- Marketplace for CI plugins
- White-labeling

The first objective is:

> Make real-time test visibility and flaky test management work beautifully for small-to-mid-size teams.

---

## 11. Definition of Success

TestPulse v1 is successful when a QA team can:

1. Sign up and create an organization in under 2 minutes.
2. Generate an API key and integrate with their CI pipeline in under 10 minutes.
3. Watch their next test run appear live on the dashboard.
4. Identify and annotate a flaky test collaboratively with teammates.
5. Quarantine the flaky test and set a resolution deadline.
6. Receive a notification when the quarantine SLA is about to expire.
7. View a pass-rate trend chart that shows improvement over time.

Build the real-time test dashboard first.
Build the collaborative annotation platform second.
Build the enterprise product third.
