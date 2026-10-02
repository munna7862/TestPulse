# TestPulse — Master Task & Sprint Execution Tracker

This centralized board tracks the execution progress across all 11 phases and 59 sprints of the `TestPulse` project.
Status indicators:
- `[ ]` **Pending / Backlog:** Not yet started; waiting on prior sprint/phase prerequisites.
- `[/]` **In Progress:** Actively being executed by assigned virtual persona(s).
- `[x]` **Completed & Verified:** Implemented, verified against quality gates, and signed off.
- `[!]` **Blocked:** Waiting on a decision or external dependency (reason noted inline).

Sprint sub-tasks are expanded from each sprint file at kick-off. Open decisions that gate sprints are tracked in [master plan §12](planning/master/TestPulse_Master_Plan.md#12-open-decisions).

---

## 🚦 Active Sprint State

- **Current Active Phase:** Phase 01: Product & Architecture Foundation
- **Current Active Sprint:** P01-S01: Product Requirements Baseline
- **Assigned Personas:** Lead `role-product-owner`; reviewers `role-scrum-master`, `role-fullstack-architect`
- **Current Status:** Ready for Kick-Off
- **Open decisions to close in Phase 01:** Q1 (P01-S01), Q2/Q3/Q5/Q6 (P01-S03), Q4 (P01-S04)

---

## Phase 01: Product & Architecture Foundation (Target: Foundation Spec)
- [ ] **P01-S01:** Product Requirements Baseline (`planning/sprints/P01-S01-product-requirements-baseline.md`)
  - [ ] Define user personas (SDET, QA Lead, Eng Manager) & primary user journeys
  - [ ] Define MVP functional requirements aligned with master plan §1 and NFRs from §10
  - [ ] Confirm plan limits & over-limit UX (master plan §8)
  - [ ] Close Q1: quarantine CI semantics
  - [ ] Define run / result / flaky / quarantine status semantics
  - [ ] Create `docs/product/prd.md` and `docs/product/glossary.md`
- [ ] **P01-S02:** UX Journeys & Information Architecture (`planning/sprints/P01-S02-ux-journeys-and-information-architecture.md`)
  - [ ] Author information architecture and route map
  - [ ] Wireframe key screens incl. settings, with loading / empty / error / read-only / plan-limit states
  - [ ] Design the onboarding checklist for the sign-up → first live run golden path
  - [ ] Define responsive breakpoints and navigation patterns
- [ ] **P01-S03:** System Architecture & Module Boundaries (`planning/sprints/P01-S03-system-architecture-and-module-boundaries.md`)
  - [ ] Document package & process topology (web, api server, worker, Neon, Redis)
  - [ ] Specify ingestion, REST and real-time contracts (`docs/api/`)
  - [ ] ER diagram for master plan §5 entities
  - [ ] ADR-001 (monorepo), ADR-002 (real-time), ADR-003 (hosting/Redis — Q3), ADR-004 (dependency majors — Q2), ADR-007 (ingestion — Q6); record Q5
- [ ] **P01-S04:** Security & Permissions Model (`planning/sprints/P01-S04-security-and-permissions-model.md`)
  - [ ] ADR-005 auth & session design; ADR-006 tenant isolation (closes Q4)
  - [ ] RBAC matrix mapped to endpoints & socket events
  - [ ] API key model; rate limiting; STRIDE threat model; CORS/CSRF/CSP
- [ ] **P01-S05:** Testing Strategy & Agent Operating Contract (`planning/sprints/P01-S05-testing-strategy-and-agent-contract.md`)
  - [ ] Testing pyramid, coverage targets & ratchet policy
  - [ ] Docker-free test infrastructure (schema-per-worker Postgres, `test:contract` real Redis)
  - [ ] Update AGENTS.md and skills to match Phase 01 decisions

---

## Phase 02: Project Bootstrap & DevOps
- [ ] **P02-S01:** Monorepo Initialization & Turborepo Setup (`planning/sprints/P02-S01-monorepo-initialization.md`)
- [ ] **P02-S02:** Frontend & Backend Scaffolding — Next.js & Fastify 5 (`planning/sprints/P02-S02-frontend-backend-scaffolding.md`)
- [ ] **P02-S03:** Database, Redis & Job Queue Setup (`planning/sprints/P02-S03-database-setup.md`)
- [ ] **P02-S04:** Developer Tooling & Code Quality (`planning/sprints/P02-S04-developer-tooling-code-quality.md`)
- [ ] **P02-S05:** CI/CD Pipeline & Deployment Targets (`planning/sprints/P02-S05-cicd-pipeline-deployment.md`)
- [ ] **P02-S06:** Design System Foundation & App Shell (`planning/sprints/P02-S06-design-system-foundation-app-shell.md`)

---

## Phase 03: Authentication & Multi-Tenancy
- [ ] **P03-S01:** User Registration, Email Verification & Password Authentication (`planning/sprints/P03-S01-user-registration-authentication.md`)
- [ ] **P03-S02:** OAuth Integration — Google & GitHub (`planning/sprints/P03-S02-oauth-integration.md`)
- [ ] **P03-S03:** Organization & Project CRUD and Membership (`planning/sprints/P03-S03-organization-crud-membership.md`)
- [ ] **P03-S04:** Invitation Flow & RBAC Authorization (`planning/sprints/P03-S04-invitation-flow-rbac.md`)
- [ ] **P03-S05:** API Key Generation, Hashing & Scoping (`planning/sprints/P03-S05-api-key-generation.md`)
- [ ] **P03-S06:** Tenant Isolation Security Hardening & Audit (`planning/sprints/P03-S06-tenant-isolation-security-hardening.md`)

---

## Phase 04: Test Run Ingestion & Data Model
- [ ] **P04-S01:** Database Schema Design — Prisma (`planning/sprints/P04-S01-database-schema-design.md`)
- [ ] **P04-S02:** Incremental Test Run Ingestion API (`planning/sprints/P04-S02-test-run-ingestion-api.md`)
- [ ] **P04-S03:** Test Case Fingerprinting & Auto-Discovery (`planning/sprints/P04-S03-test-case-deduplication.md`)
- [ ] **P04-S04:** History Timeline & Query APIs (`planning/sprints/P04-S04-history-timeline-query-apis.md`)
- [ ] **P04-S05:** CI Reporter npm Package — Playwright + Vitest (`planning/sprints/P04-S05-ci-reporter-npm-package.md`)
- [ ] **P04-S06:** Ingestion Performance, Quotas & Data Retention (`planning/sprints/P04-S06-batch-performance-data-retention.md`)

---

## Phase 05: Real-Time Dashboard
- [ ] **P05-S01:** WebSocket Gateway — Socket.IO + Redis Adapter (`planning/sprints/P05-S01-websocket-infrastructure.md`)
- [ ] **P05-S02:** Socket.IO Client Integration & Connection Management (`planning/sprints/P05-S02-socketio-client-integration.md`)
- [ ] **P05-S03:** Live Test Run Progress View (`planning/sprints/P05-S03-live-test-run-progress.md`)
- [ ] **P05-S04:** Run Summary Cards & Filtered Run List (`planning/sprints/P05-S04-run-summary-cards-list.md`)
- [ ] **P05-S05:** Test Case Detail View & Execution Timeline (`planning/sprints/P05-S05-test-case-detail-view.md`)
- [ ] **P05-S06:** Connection Resilience, Polling Fallback & Performance (`planning/sprints/P05-S06-connection-resilience-performance.md`)

---

## Phase 06: Flaky Test Detection & Quarantine
- [ ] **P06-S01:** Flaky Test Detection Engine (`planning/sprints/P06-S01-flaky-test-detection-engine.md`)
- [ ] **P06-S02:** Quarantine Lifecycle State Machine (`planning/sprints/P06-S02-quarantine-lifecycle-state-machine.md`)
- [ ] **P06-S03:** Collaborative Annotations, Labels & Mentions (`planning/sprints/P06-S03-collaborative-annotations.md`)
- [ ] **P06-S04:** Quarantine Dashboard & Bulk Operations (`planning/sprints/P06-S04-quarantine-dashboard-bulk-operations.md`)
- [ ] **P06-S05:** SLA Enforcement, Escalation Markers & Metrics (`planning/sprints/P06-S05-sla-enforcement-escalation-metrics.md`)

---

## Phase 07: Notifications & Integrations
- [ ] **P07-S01:** In-App Notification Center & Notification Router (`planning/sprints/P07-S01-in-app-notification-center.md`)
- [ ] **P07-S02:** Email Notification System (`planning/sprints/P07-S02-email-notification-system.md`)
- [ ] **P07-S03:** Notification Preferences & Digests (`planning/sprints/P07-S03-notification-preferences-digests.md`)
- [ ] **P07-S04:** GitHub CI Reporting — Job Summary, PR Comment & Check Run (`planning/sprints/P07-S04-github-ci-reporter.md`)
- [ ] **P07-S05:** Webhook Dispatcher (`planning/sprints/P07-S05-webhook-system.md`)

---

## Phase 08: Analytics & Reporting
- [ ] **P08-S01:** Analytics Aggregation Pipeline (`planning/sprints/P08-S01-aggregation-pipeline.md`)
- [ ] **P08-S02:** Pass Rate & Execution Duration Charts (`planning/sprints/P08-S02-pass-rate-duration-charts.md`)
- [ ] **P08-S03:** Top Failing, Slowest & Flakiest Leaderboards (`planning/sprints/P08-S03-top-failing-slowest-flakiest.md`)
- [ ] **P08-S04:** MTTR, Branch Comparison & Data Export (`planning/sprints/P08-S04-mttr-branch-comparison-export.md`)

---

## Phase 09: UX Polish & Accessibility
- [ ] **P09-S01:** Design System Consolidation & Visual Regression (`planning/sprints/P09-S01-design-system-consolidation.md`)
- [ ] **P09-S02:** Theme QA & Chart Theming (`planning/sprints/P09-S02-theme-qa-chart-theming.md`)
- [ ] **P09-S03:** Micro-Animations & Skeleton Loading States (`planning/sprints/P09-S03-micro-animations-skeletons.md`)
- [ ] **P09-S04:** Error, Empty & Loading State Audit (`planning/sprints/P09-S04-error-empty-loading-states.md`)
- [ ] **P09-S05:** WCAG 2.1 AA Accessibility & Keyboard Navigation (`planning/sprints/P09-S05-accessibility-keyboard-navigation.md`)

---

## Phase 10: Quality Engineering & Release
- [ ] **P10-S01:** Test Coverage Audit (`planning/sprints/P10-S01-test-coverage-audit.md`)
- [ ] **P10-S02:** Integration & End-to-End Test Hardening (`planning/sprints/P10-S02-integration-e2e-hardening.md`)
- [ ] **P10-S03:** Performance & Load Testing — k6 (`planning/sprints/P10-S03-performance-load-testing.md`)
- [ ] **P10-S04:** Security Audit & Supply Chain Review (`planning/sprints/P10-S04-security-audit-dependency-review.md`)
- [ ] **P10-S05:** Staging Deployment & Environment Validation (`planning/sprints/P10-S05-staging-deployment-validation.md`)
- [ ] **P10-S06:** v1.0 Release Candidate & Private Beta Launch (`planning/sprints/P10-S06-release-candidate-signoff.md`)

---

## Phase 11: Landing Page, Docs & Go-to-Market
- [ ] **P11-S01:** Marketing Landing Page (`planning/sprints/P11-S01-landing-page.md`)
- [ ] **P11-S02:** Developer Documentation Portal (`planning/sprints/P11-S02-documentation-site.md`)
- [ ] **P11-S03:** CI Integration Guides & Interactive API Reference (`planning/sprints/P11-S03-ci-integration-guides-api-reference.md`)
- [ ] **P11-S04:** SEO, OpenGraph & Privacy-First Analytics (`planning/sprints/P11-S04-seo-opengraph-analytics.md`)
- [ ] **P11-S05:** Public Launch — Product Hunt & GTM (`planning/sprints/P11-S05-product-hunt-launch.md`)
