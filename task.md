# TestPulse — Master Task & Sprint Execution Tracker

This centralized board tracks the execution progress across all 11 phases and 60 sprints of the `TestPulse` project.
Status indicators:
- `[ ]` **Pending / Backlog:** Not yet started; waiting on prior sprint/phase prerequisites.
- `[/]` **In Progress:** Actively being executed by assigned virtual persona(s).
- `[x]` **Completed & Verified:** Implemented, verified against quality gates, and signed off.
- `[!]` **Blocked:** Waiting on a decision or external dependency (reason noted inline).

Sprint sub-tasks are expanded from each sprint file at kick-off. Open decisions that gate sprints are tracked in [master plan §12](planning/master/TestPulse_Master_Plan.md#12-open-decisions).

---

## 🚦 Active Sprint State

- **Current Active Phase:** Phase 03: Authentication & Multi-Tenancy
- **Current Active Sprint:** P03-S01: User Registration, Email Verification & Password Authentication
- **Assigned Personas:** Lead `role-backend-engineer`, `role-frontend-engineer`; reviewers `role-security-engineer`, `role-sdet-architect`
- **Current Status:** Phase 03 Sprint 01 complete & verified; PR ready
- **Decisions:** Phase 01 closed Q1, Q2, Q4, Q5, Q6 (master plan D-16…D-20). Only Q3 (paid hosting) remains, owned by P10-S06.
- **Hosting:** free-tier profile until feature-complete (master plan §4.4)
- **Traceability:** [feature catalog](docs/product/feature-catalog.md) (FR IDs) · [scenario catalog](docs/testing/scenario-catalog.md) (SC IDs)

## ✅ Completion Log

| Phase / Sprint | Completed | Evidence | Notes |
| :--- | :--- | :--- | :--- |
| Planning review | 2026-10-02 | [PR #1](https://github.com/munna7862/TestPulse/pull/1), [PR #2](https://github.com/munna7862/TestPulse/pull/2) | Master plan, skills, phases, sprints, free-tier profile, FR/SC catalogs |
| Phase 01 (P01-S01…S05) | 2026-10-02 | [PR #3](https://github.com/munna7862/TestPulse/pull/3) | PRD, UX/IA, architecture & 7 ADRs, security model, testing strategy; closed Q1, Q2, Q4, Q5, Q6 |
| Phase 02 (P02-S01…S06) | 2026-10-02 | [PR #4](https://github.com/munna7862/TestPulse/pull/4), [PR #5](https://github.com/munna7862/TestPulse/pull/5), [PR #6](https://github.com/munna7862/TestPulse/pull/6) | Monorepo bootstrap, Fastify 5 & Next.js 16, Prisma/Neon, dev tooling, CI/CD pipelines, design system & app shell |
| P03-S01 | 2026-10-02 | commit `feat(auth): user registration, email verification and session auth (P03-S01)` | API-owned auth, argon2id, rotating cookies, CSRF guard, Next.js auth pages, Playwright & Axe tests |

---

## Phase 01: Product & Architecture Foundation — ✅ COMPLETE (signed off 2026-10-02 via [PR #3](https://github.com/munna7862/TestPulse/pull/3))
- [x] **P01-S01:** Product Requirements Baseline (`planning/sprints/P01-S01-product-requirements-baseline.md`) — ✅ 2026-10-02, PR #3
  - [x] Define user personas (SDET, QA Lead, Eng Manager) & primary user journeys
  - [x] Define MVP functional requirements aligned with master plan §1 and NFRs from §10
  - [x] Confirm plan limits & over-limit UX (master plan §8)
  - [x] Close Q1: quarantine CI semantics
  - [x] Define run / result / flaky / quarantine status semantics
  - [x] Create `docs/product/prd.md` and `docs/product/glossary.md`; refine `docs/product/feature-catalog.md`
- [x] **P01-S02:** UX Journeys & Information Architecture (`planning/sprints/P01-S02-ux-journeys-and-information-architecture.md`) — ✅ 2026-10-02, PR #3
  - [x] Author information architecture and route map
  - [x] Wireframe key screens incl. settings, with loading / empty / error / read-only / plan-limit states
  - [x] Design the onboarding checklist for the sign-up → first live run golden path
  - [x] Define responsive breakpoints and navigation patterns
- [x] **P01-S03:** System Architecture & Module Boundaries (`planning/sprints/P01-S03-system-architecture-and-module-boundaries.md`) — ✅ 2026-10-02, PR #3
  - [x] Document package & process topology (web, api server, worker, Neon, Redis)
  - [x] Specify ingestion, REST and real-time contracts (`docs/api/`)
  - [x] ER diagram for master plan §5 entities
  - [x] ADR-001 (monorepo), ADR-002 (real-time), ADR-003 (free-tier hosting profile), ADR-004 (dependency majors — Q2), ADR-007 (ingestion — Q6); record Q5
- [x] **P01-S04:** Security & Permissions Model (`planning/sprints/P01-S04-security-and-permissions-model.md`) — ✅ 2026-10-02, PR #3
  - [x] ADR-005 auth & session design; ADR-006 tenant isolation (closes Q4)
  - [x] RBAC matrix mapped to endpoints & socket events
  - [x] API key model; rate limiting; STRIDE threat model; CORS/CSRF/CSP
- [x] **P01-S05:** Testing Strategy & Agent Operating Contract (`planning/sprints/P01-S05-testing-strategy-and-agent-contract.md`) — ✅ 2026-10-02, PR #3
  - [x] Testing pyramid, coverage targets & ratchet policy
  - [x] Docker-free test infrastructure (schema-per-worker Postgres, `test:contract` real Redis)
  - [x] Update AGENTS.md and skills to match Phase 01 decisions
  - [x] Refine `docs/testing/scenario-catalog.md` (critical journeys, gaps found in Phase 01)

---

## Phase 02: Project Bootstrap & DevOps — ✅ COMPLETE
- [x] **P02-S01:** Monorepo Initialization & Turborepo Setup (`planning/sprints/P02-S01-monorepo-initialization.md`) — ✅ commit `e9d9db2`
- [x] **P02-S02:** Frontend & Backend Scaffolding — Next.js & Fastify 5 (`planning/sprints/P02-S02-frontend-backend-scaffolding.md`) — ✅ commit `c34f455`
- [x] **P02-S03:** Database, Redis & Job Queue Setup (`planning/sprints/P02-S03-database-setup.md`) — ✅ commit `2b15ff7`
- [x] **P02-S04:** Developer Tooling & Code Quality (`planning/sprints/P02-S04-developer-tooling-code-quality.md`) — ✅ 2026-10-02
  - [x] Configure ESLint 10 flat config (`eslint.config.mjs`) with typescript-eslint type-checked rules
  - [x] Add boundary rules (`no-restricted-imports`): web ↛ db, shared stays browser-safe, `@prisma/client` only in packages/db, no cross-package relative imports
  - [x] Configure Prettier with `eslint-config-prettier` to avoid rule conflicts
  - [x] Confirm TypeScript strict mode in every workspace via shared base config (`tsconfig.base.json`)
  - [x] Set up Husky pre-commit hooks with lint-staged
  - [x] Configure commitlint for conventional commit enforcement
  - [x] Add VS Code workspace settings and recommended extensions (`.vscode/settings.json`, `.vscode/extensions.json`)
  - [x] Create npm scripts: lint, lint:fix, format, format:check, typecheck
- [x] **P02-S05:** CI/CD Pipeline & Deployment Targets (`planning/sprints/P02-S05-cicd-pipeline-deployment.md`) — ✅ 2026-10-02
  - [x] Create `.github/workflows/ci.yml` with concurrency, Postgres 16 & Redis 7 services, verify & e2e jobs
  - [x] Create `.github/workflows/deploy-staging.yml` for Prisma migrations and Render deploy hook trigger
  - [x] Create `.github/workflows/keep-alive.yml` for working-hours ping reducing free-tier cold starts
  - [x] Create Render blueprint (`render.yaml`) for Fastify API service with `RUN_WORKERS_IN_PROCESS=true`
  - [x] Author automated traceability gate (`scripts/check-traceability.mjs`, `npm run check:traceability`)
  - [x] Implement Playwright smoke suite and axe-core accessibility checks in `apps/web/e2e/smoke.spec.ts`
  - [x] Implement Sentry observability helpers in `apps/api` and `apps/web`
  - [x] Create root `.env.example`, update `docs/ops/environment.md`, and add status badges to `README.md`
- [x] **P02-S06:** Design System Foundation & App Shell (`planning/sprints/P02-S06-design-system-foundation-app-shell.md`) — ✅ 2026-10-02
  - [x] Define semantic design tokens and WCAG 2.1 AA contrast in Tailwind v4 `@theme`
  - [x] Implement no-flash dark/light/system theme switcher with persistence
  - [x] Configure self-hosted Inter & JetBrains Mono fonts via `next/font`
  - [x] Build base primitives in `@testpulse/ui` (Button, Input, Select, Checkbox, Badge, StatusBadge, Card, Dialog, DropdownMenu, Tooltip, Tabs, Table, Skeleton, EmptyState, Toast, CodeBlock)
  - [x] Build responsive app shell layout (sidebar, header with org/project slots, connection status pill, breadcrumbs)
  - [x] Create interactive component catalog route (`/dev/ui`)
  - [x] Implement Playwright E2E and axe-core accessibility tests

---

## Phase 03: Authentication & Multi-Tenancy
- [x] **P03-S01:** User Registration, Email Verification & Password Authentication (`planning/sprints/P03-S01-user-registration-authentication.md`) — ✅ 2026-10-02
  - [x] Extend Prisma schema with User fields, Session, VerificationToken, and OAuthAccount models; apply migration
  - [x] Create shared Zod schemas in `@testpulse/shared` for registration, verification, login, refresh, logout, password reset, and user profile
  - [x] Implement password hashing with argon2id (memory 19 MiB, iterations 2, length 10..256)
  - [x] Implement token generation, HMAC-SHA256 hashing, and cookie helpers
  - [x] Implement transactional Mailer interface with in-memory TestMailer and dev ConsoleMailer
  - [x] Implement Fastify auth routes: register, verify-email, resend-verification, login, refresh, logout, logout-all, forgot/reset password, me
  - [x] Implement authenticateUser preHandler and CSRF Origin validation for cookie mutations
  - [x] Implement Next.js auth pages: /login, /register, /verify-email, /forgot-password, /reset-password
  - [x] Author unit, integration, and Playwright E2E suites with Axe accessibility checks (SC-AUTH-001..012, 017..020)
  - [x] Author sprint walkthrough and verify all quality gates
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
- [ ] **P10-S05:** Free-Tier Staging Deployment & Validation (`planning/sprints/P10-S05-staging-deployment-validation.md`)
- [ ] **P10-S06:** Paid Production Infrastructure Decision & Migration (`planning/sprints/P10-S06-paid-production-migration.md`)
- [ ] **P10-S07:** v1.0 Release Candidate & Private Beta Launch (`planning/sprints/P10-S07-release-candidate-signoff.md`)

---

## Phase 11: Landing Page, Docs & Go-to-Market
- [ ] **P11-S01:** Marketing Landing Page (`planning/sprints/P11-S01-landing-page.md`)
- [ ] **P11-S02:** Developer Documentation Portal (`planning/sprints/P11-S02-documentation-site.md`)
- [ ] **P11-S03:** CI Integration Guides & Interactive API Reference (`planning/sprints/P11-S03-ci-integration-guides-api-reference.md`)
- [ ] **P11-S04:** SEO, OpenGraph & Privacy-First Analytics (`planning/sprints/P11-S04-seo-opengraph-analytics.md`)
- [ ] **P11-S05:** Public Launch — Product Hunt & GTM (`planning/sprints/P11-S05-product-hunt-launch.md`)
