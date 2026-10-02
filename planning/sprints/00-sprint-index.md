# TestPulse Sprint Plan Index & Execution Guide

## Purpose

This is the master execution directory for all 60 sprints across 11 phases in the `TestPulse` engineering lifecycle. Each sprint is granular, self-contained, and names its lead and reviewer personas from `.agents/skills/` in a `## Personas` section.

Canonical contracts (ingestion API, events, domain model, RBAC, plan limits, deployment profiles, performance targets) live in the [Master Plan](../master/TestPulse_Master_Plan.md) §0–§10. Sprint files reference them instead of redefining them. Features (`FR-*`) and test scenarios (`SC-*`) are tracked in the [feature catalog](../../docs/product/feature-catalog.md) and [scenario catalog](../../docs/testing/scenario-catalog.md).

---

## 🏗️ Sprint Hierarchy & Execution Model

```text
Master Plan (planning/master/TestPulse_Master_Plan.md)   ← canonical contracts, decisions, open questions
  └── Phase Blueprint (planning/phases/XX-phase-*.md)
        └── Sprint Plan (planning/sprints/PXX-SYY-*.md)
              └── Root Task Tracker (task.md)
                    ├── 1. Pre-flight Check (Scrum Master): dependencies [x], open decisions closed
                    ├── 2. Contracts & Test Catalog (Architect & SDET)
                    ├── 3. Implementation (lead persona from ## Personas)
                    ├── 4. Verification & Security Audit (SDET & Security)
                    ├── 5. Acceptance Review (Product Owner)
                    └── 6. Walkthrough, Release & Merge (DevOps)
```

### Sprint file anatomy

| Section | Purpose |
| :--- | :--- |
| Sprint Objective / Dependencies | Why the sprint exists and what must be `[x]` first |
| Personas | Lead implementer(s) and reviewers who sign off |
| Scope → Granular Implementation Tasks | The work, and the contract for the agent session |
| Expected Files / Areas | Where changes or documents land (paths follow `doc-implementation-standards`) |
| Testing & Verification / Acceptance Criteria | How "done" is proven |
| Risks / Guardrails | Known traps |
| Antigravity Execution Prompt | A short prompt that points the agent at this file. It deliberately does **not** copy the tasks, so it cannot drift from them |
| Sprint Definition of Done | Documentation DoD for Phase 01; code DoD (with UI checks where relevant) afterwards |

---

## 📊 Phase Breakdown & Sprint Counts

| Phase | Blueprint File | Sprint Count | Focus Area |
| :--- | :--- | :---: | :--- |
| **01** | [`01-phase-product-architecture-foundation.md`](../phases/01-phase-product-architecture-foundation.md) | 5 | PRD, IA, architecture & ADRs, security model, testing strategy (docs only) |
| **02** | [`02-phase-project-bootstrap-devops.md`](../phases/02-phase-project-bootstrap-devops.md) | 6 | Turborepo, Next.js, Fastify, Prisma, BullMQ skeleton, CI/CD, design-system foundation |
| **03** | [`03-phase-authentication-multi-tenancy.md`](../phases/03-phase-authentication-multi-tenancy.md) | 6 | API-owned auth, OAuth, org/project CRUD, RBAC, API keys, isolation audit |
| **04** | [`04-phase-test-run-ingestion-data-model.md`](../phases/04-phase-test-run-ingestion-data-model.md) | 6 | Incremental ingestion, fingerprinting, query APIs, `@testpulse/reporter`, quotas |
| **05** | [`05-phase-real-time-dashboard.md`](../phases/05-phase-real-time-dashboard.md) | 6 | Socket.IO gateway, live streaming UI, resilience |
| **06** | [`06-phase-flaky-test-detection-quarantine.md`](../phases/06-phase-flaky-test-detection-quarantine.md) | 5 | Flaky engine, quarantine state machine, annotations, SLA markers |
| **07** | [`07-phase-notifications-integrations.md`](../phases/07-phase-notifications-integrations.md) | 5 | Notification router, in-app, email, preferences, GitHub CI reporting, webhooks |
| **08** | [`08-phase-analytics-reporting.md`](../phases/08-phase-analytics-reporting.md) | 4 | Aggregations, trends, leaderboards, MTTR, exports |
| **09** | [`09-phase-ux-polish-accessibility.md`](../phases/09-phase-ux-polish-accessibility.md) | 5 | Design-system consolidation, theme QA, motion, states, WCAG audit |
| **10** | [`10-phase-quality-engineering-release.md`](../phases/10-phase-quality-engineering-release.md) | 7 | E2E hardening, load tests, security audit, free-tier staging, paid migration, v1.0 private beta |
| **11** | [`11-phase-landing-page-docs-gtm.md`](../phases/11-phase-landing-page-docs-gtm.md) | 5 | Marketing site, docs portal, SEO/analytics, public launch |
| **Total** | | **60** | Complete Production SaaS Release |

---

## 📋 Complete Sprint File Registry

### Phase 01: Product & Architecture Foundation
- [`P01-S01-product-requirements-baseline.md`](./P01-S01-product-requirements-baseline.md) — PRD, personas, journeys, status definitions, closes Q1
- [`P01-S02-ux-journeys-and-information-architecture.md`](./P01-S02-ux-journeys-and-information-architecture.md) — IA, route map, wireframes, screen states
- [`P01-S03-system-architecture-and-module-boundaries.md`](./P01-S03-system-architecture-and-module-boundaries.md) — Topology, contracts, ER diagram, ADR-001–004/007
- [`P01-S04-security-and-permissions-model.md`](./P01-S04-security-and-permissions-model.md) — Auth design, RBAC, threat model, ADR-005/006
- [`P01-S05-testing-strategy-and-agent-contract.md`](./P01-S05-testing-strategy-and-agent-contract.md) — Test pyramid, Docker-free infra, AGENTS.md update

### Phase 02: Project Bootstrap & DevOps
- [`P02-S01-monorepo-initialization.md`](./P02-S01-monorepo-initialization.md) — npm workspaces, Turborepo 2, Node 24, line endings
- [`P02-S02-frontend-backend-scaffolding.md`](./P02-S02-frontend-backend-scaffolding.md) — Next.js + Fastify 5 (server + worker entrypoints)
- [`P02-S03-database-setup.md`](./P02-S03-database-setup.md) — Prisma, tenant client, test DB harness, Redis, BullMQ skeleton
- [`P02-S04-developer-tooling-code-quality.md`](./P02-S04-developer-tooling-code-quality.md) — ESLint flat config + boundary rules, Prettier, strict TS
- [`P02-S05-cicd-pipeline-deployment.md`](./P02-S05-cicd-pipeline-deployment.md) — GitHub Actions, free-tier staging (Vercel Hobby, Render, Neon), Sentry, traceability check
- [`P02-S06-design-system-foundation-app-shell.md`](./P02-S06-design-system-foundation-app-shell.md) — Tokens, dark/light theming, primitives, app shell

### Phase 03: Authentication & Multi-Tenancy
- [`P03-S01-user-registration-authentication.md`](./P03-S01-user-registration-authentication.md) — Registration, email verification, cookie sessions, reset, Mailer
- [`P03-S02-oauth-integration.md`](./P03-S02-oauth-integration.md) — Google/GitHub OAuth with safe account linking
- [`P03-S03-organization-crud-membership.md`](./P03-S03-organization-crud-membership.md) — Org & project CRUD, tenant context, onboarding
- [`P03-S04-invitation-flow-rbac.md`](./P03-S04-invitation-flow-rbac.md) — Invitations and the shared RBAC permission map
- [`P03-S05-api-key-generation.md`](./P03-S05-api-key-generation.md) — Project-scoped ingest keys, hashing, revocation
- [`P03-S06-tenant-isolation-security-hardening.md`](./P03-S06-tenant-isolation-security-hardening.md) — Isolation suite, rate limits, headers, audit events

### Phase 04: Test Run Ingestion & Data Model
- [`P04-S01-database-schema-design.md`](./P04-S01-database-schema-design.md) — Runs, suites, cases, results (master plan §5)
- [`P04-S02-test-run-ingestion-api.md`](./P04-S02-test-run-ingestion-api.md) — Incremental ingestion (start / batches / complete), RealtimePublisher
- [`P04-S03-test-case-deduplication.md`](./P04-S03-test-case-deduplication.md) — Cross-platform fingerprinting & auto-discovery
- [`P04-S04-history-timeline-query-apis.md`](./P04-S04-history-timeline-query-apis.md) — Run, result, and test case history query APIs
- [`P04-S05-ci-reporter-npm-package.md`](./P04-S05-ci-reporter-npm-package.md) — `@testpulse/reporter` for Playwright + Vitest
- [`P04-S06-batch-performance-data-retention.md`](./P04-S06-batch-performance-data-retention.md) — Throughput, quotas, retention, stale-run reaper

### Phase 05: Real-Time Dashboard
- [`P05-S01-websocket-infrastructure.md`](./P05-S01-websocket-infrastructure.md) — Socket.IO gateway & Redis adapter, room auth
- [`P05-S02-socketio-client-integration.md`](./P05-S02-socketio-client-integration.md) — Cookie-authenticated client, connection state
- [`P05-S03-live-test-run-progress.md`](./P05-S03-live-test-run-progress.md) — Live progress view (virtualized)
- [`P05-S04-run-summary-cards-list.md`](./P05-S04-run-summary-cards-list.md) — Run cards and filtered run list
- [`P05-S05-test-case-detail-view.md`](./P05-S05-test-case-detail-view.md) — Test case detail with history timeline
- [`P05-S06-connection-resilience-performance.md`](./P05-S06-connection-resilience-performance.md) — Refetch catch-up, polling fallback, perf smoke

### Phase 06: Flaky Test Detection & Quarantine
- [`P06-S01-flaky-test-detection-engine.md`](./P06-S01-flaky-test-detection-engine.md) — Retry / same-commit / transition signals
- [`P06-S02-quarantine-lifecycle-state-machine.md`](./P06-S02-quarantine-lifecycle-state-machine.md) — Quarantine state machine & audit trail
- [`P06-S03-collaborative-annotations.md`](./P06-S03-collaborative-annotations.md) — Comments, labels, @mentions
- [`P06-S04-quarantine-dashboard-bulk-operations.md`](./P06-S04-quarantine-dashboard-bulk-operations.md) — Quarantine table with bulk actions
- [`P06-S05-sla-enforcement-escalation-metrics.md`](./P06-S05-sla-enforcement-escalation-metrics.md) — SLA markers, domain events, MTTR

### Phase 07: Notifications & Integrations
- [`P07-S01-in-app-notification-center.md`](./P07-S01-in-app-notification-center.md) — Notification router and in-app center
- [`P07-S02-email-notification-system.md`](./P07-S02-email-notification-system.md) — Queued, templated email with unsubscribe
- [`P07-S03-notification-preferences-digests.md`](./P07-S03-notification-preferences-digests.md) — Preferences and digest batching
- [`P07-S04-github-ci-reporter.md`](./P07-S04-github-ci-reporter.md) — Job summary, PR comment, check run via `GITHUB_TOKEN`
- [`P07-S05-webhook-system.md`](./P07-S05-webhook-system.md) — Signed, SSRF-safe outgoing webhooks

### Phase 08: Analytics & Reporting
- [`P08-S01-aggregation-pipeline.md`](./P08-S01-aggregation-pipeline.md) — Daily metric tables (incremental + nightly)
- [`P08-S02-pass-rate-duration-charts.md`](./P08-S02-pass-rate-duration-charts.md) — Pass rate and duration trend charts
- [`P08-S03-top-failing-slowest-flakiest.md`](./P08-S03-top-failing-slowest-flakiest.md) — Test health leaderboards
- [`P08-S04-mttr-branch-comparison-export.md`](./P08-S04-mttr-branch-comparison-export.md) — MTTR, branch comparison, CSV/JSON export

### Phase 09: UX Polish & Accessibility
- [`P09-S01-design-system-consolidation.md`](./P09-S01-design-system-consolidation.md) — Design-system audit & visual regression baselines
- [`P09-S02-theme-qa-chart-theming.md`](./P09-S02-theme-qa-chart-theming.md) — Theme QA across all screens and charts
- [`P09-S03-micro-animations-skeletons.md`](./P09-S03-micro-animations-skeletons.md) — Motion and skeleton polish
- [`P09-S04-error-empty-loading-states.md`](./P09-S04-error-empty-loading-states.md) — State audit and recovery UX
- [`P09-S05-accessibility-keyboard-navigation.md`](./P09-S05-accessibility-keyboard-navigation.md) — WCAG 2.1 AA audit & keyboard navigation

### Phase 10: Quality Engineering & Release
- [`P10-S01-test-coverage-audit.md`](./P10-S01-test-coverage-audit.md) — Coverage audit & gap analysis
- [`P10-S02-integration-e2e-hardening.md`](./P10-S02-integration-e2e-hardening.md) — Critical-journey E2E suite
- [`P10-S03-performance-load-testing.md`](./P10-S03-performance-load-testing.md) — k6 load tests against master plan §10
- [`P10-S04-security-audit-dependency-review.md`](./P10-S04-security-audit-dependency-review.md) — Security audit & supply chain review
- [`P10-S05-staging-deployment-validation.md`](./P10-S05-staging-deployment-validation.md) — Free-tier staging validation & runbook
- [`P10-S06-paid-production-migration.md`](./P10-S06-paid-production-migration.md) — Decision gate: choose and build paid production, re-verify NFRs
- [`P10-S07-release-candidate-signoff.md`](./P10-S07-release-candidate-signoff.md) — v1.0 RC, reporter publish, private beta launch

### Phase 11: Landing Page, Docs & Go-to-Market
- [`P11-S01-landing-page.md`](./P11-S01-landing-page.md) — Marketing landing page
- [`P11-S02-documentation-site.md`](./P11-S02-documentation-site.md) — Docs portal & quickstart
- [`P11-S03-ci-integration-guides-api-reference.md`](./P11-S03-ci-integration-guides-api-reference.md) — CI guides & OpenAPI reference
- [`P11-S04-seo-opengraph-analytics.md`](./P11-S04-seo-opengraph-analytics.md) — SEO, OpenGraph, privacy-first analytics
- [`P11-S05-product-hunt-launch.md`](./P11-S05-product-hunt-launch.md) — Public launch (Product Hunt & GTM)

---

## ⚙️ Standard Operating Workflow

When kicking off a sprint:
1. **Scrum Master** confirms that the sprint's dependencies are `[x]` and its open decisions (master plan §12) are closed, then marks it `[/]` in `task.md` and expands its tasks.
2. Paste the sprint's **Antigravity Execution Prompt** into the agent. It loads `AGENTS.md`, the master plan, the phase blueprint, the sprint file, and the lead persona skills.
3. The agent inspects existing code and outputs an implementation plan artifact before editing (and a test case catalog for code sprints).
4. Execute changes, adhering to Zod boundary validation and tenant isolation.
5. Run the verification commands (`npm run lint`, `typecheck`, `test`, `build`, plus `test:contract` / `test:e2e` where applicable) and record the real output.
6. Reviewer personas sign off; write the walkthrough; mark `[x]` in `task.md`.

If a sprint needs to change a canonical contract, the same PR must include an ADR and the master plan update.
