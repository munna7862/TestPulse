# Feature Catalog (Functional Requirements Register)

> **Status:** Seeded during the planning review (2026-10). P01-S01 refines it; every sprint keeps it current.
> **Purpose:** One ID per feature, so requirements, sprints, test scenarios, PRs, and bugs can always be traced to each other (master plan D-15).

## How to use this file

- **IDs are permanent.** Never renumber or reuse an ID. A dropped feature gets status `Deferred` or `Removed` and stays in the table.
- **Scenarios** are the `SC-*` IDs in [`docs/testing/scenario-catalog.md`](../testing/scenario-catalog.md) that prove the feature works. Every feature must have at least one.
- **Status values:** `Planned` → `In progress` → `Done` (all its scenarios automated and green) · `Deferred` (post-MVP) · `Removed`.
- Update the status in the same PR that completes the sprint. PR descriptions list the FR IDs they touch.
- Canonical behavior details live in the master plan and the sprint files. This file is an index, not a spec.

---

## AUTH — Authentication & sessions

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-AUTH-01 | Email/password registration with generic (non-enumerating) responses | P03-S01 | SC-AUTH-001, SC-AUTH-002, SC-AUTH-003 | Planned |
| FR-AUTH-02 | Email verification with single-use, expiring tokens | P03-S01 | SC-AUTH-004, SC-AUTH-005 | Planned |
| FR-AUTH-03 | Login with first-party `HttpOnly` cookie session (access 15 min, refresh 30 days) | P03-S01 | SC-AUTH-006, SC-AUTH-007 | Planned |
| FR-AUTH-04 | Refresh-token rotation with reuse detection (family revocation) | P03-S01 | SC-AUTH-008, SC-AUTH-009 | Planned |
| FR-AUTH-05 | Logout (current session) and logout everywhere | P03-S01 | SC-AUTH-010 | Planned |
| FR-AUTH-06 | Password reset (request + confirm), revoking existing sessions | P03-S01 | SC-AUTH-011, SC-AUTH-012 | Planned |
| FR-AUTH-07 | Google and GitHub OAuth sign-in (PKCE + state) | P03-S02 | SC-AUTH-013, SC-AUTH-014 | Planned |
| FR-AUTH-08 | Safe OAuth account linking (verified emails only) | P03-S02 | SC-AUTH-015, SC-AUTH-016 | Planned |
| FR-AUTH-09 | Auth rate limiting (per IP and per account) | P03-S01, P03-S06 | SC-AUTH-017 | Planned |
| FR-AUTH-10 | CSRF protection for cookie-authenticated mutations (Origin check) | P03-S01 | SC-AUTH-018 | Planned |

## ORG — Organizations, projects, membership

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-ORG-01 | Create organization (creator becomes Owner) | P03-S03 | SC-ORG-001 | Planned |
| FR-ORG-02 | List/switch my organizations; view org details and members | P03-S03 | SC-ORG-002 | Planned |
| FR-ORG-03 | Update org settings (Admin+); delete org (Owner, async purge) | P03-S03 | SC-ORG-003, SC-ORG-004 | Planned |
| FR-ORG-04 | Ownership transfer (exactly one Owner) | P03-S03 | SC-ORG-005, SC-ORG-006 | Planned |
| FR-ORG-05 | Project CRUD with settings (SLA, retention, flaky thresholds, tracked branches) | P03-S03, P06-S01, P06-S05 | SC-ORG-007, SC-ORG-008 | Planned |
| FR-ORG-06 | Onboarding to first org + project (golden-path checklist) | P03-S03, P01-S02 | SC-ORG-009, SC-E2E-001 | Planned |
| FR-ORG-07 | Invitations: create, list, revoke, resend, accept (bound to verified email) | P03-S04 | SC-ORG-010, SC-ORG-011, SC-ORG-012, SC-ORG-013, SC-E2E-004 | Planned |
| FR-ORG-08 | Role change and member removal (never to/from Owner); self-leave | P03-S04 | SC-ORG-014, SC-ORG-015 | Planned |
| FR-ORG-09 | Shared RBAC permission map used by API and UI | P03-S04 | SC-ORG-016, SC-SEC-002 | Planned |

## KEY — API keys

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-KEY-01 | Generate project API key (Admin+), plaintext shown once, hash stored | P03-S05 | SC-KEY-001, SC-KEY-002 | Planned |
| FR-KEY-02 | List keys (prefix + metadata only) and revoke (immediate) | P03-S05 | SC-KEY-003, SC-KEY-004 | Planned |
| FR-KEY-03 | API key authentication limited to `/api/v1/ingest/*` of its own project | P03-S05 | SC-KEY-005, SC-KEY-006 | Planned |
| FR-KEY-04 | Per-key and per-project ingestion rate limits | P03-S05, P04-S06 | SC-KEY-007 | Planned |

## ING — Ingestion

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-ING-01 | Start run, idempotent on `externalRunId`; atomic `runNumber` | P04-S02 | SC-ING-001, SC-ING-002 | Planned |
| FR-ING-02 | Shards join one run and complete independently | P04-S02 | SC-ING-003, SC-ING-008 | Planned |
| FR-ING-03 | Result batches (≤1,000 items, ≤5 MB) upserted idempotently | P04-S02 | SC-ING-004, SC-ING-005, SC-ING-006 | Planned |
| FR-ING-04 | Run completion computes final status and enqueues analysis + domain events | P04-S02 | SC-ING-007, SC-ING-008 | Planned |
| FR-ING-05 | Cross-platform test fingerprinting and auto-discovery of suites/cases | P04-S03 | SC-ING-009, SC-ING-010, SC-ING-011 | Planned |
| FR-ING-06 | Ingest quarantine list for reporters | P04-S02, P06-S02 | SC-ING-012 | Planned |
| FR-ING-07 | Monthly run quota per org (`429 QUOTA_EXCEEDED`) | P04-S06 | SC-ING-013, SC-PLAN-003 | Planned |
| FR-ING-08 | Stale-run reaper (`TIMED_OUT` after 30 min inactivity) | P04-S06 | SC-ING-014 | Planned |
| FR-ING-09 | Throughput: 10,000 results in < 5 s (master plan §10) | P04-S06, P10-S03 | SC-PERF-001 | Planned |
| FR-ING-10 | Run summary endpoint for CI-side reporting | P07-S04 | SC-GH-001 | Planned |

## REP — `@testpulse/reporter`

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-REP-01 | Playwright reporter streams results during the run | P04-S05 | SC-REP-001, SC-E2E-001 | Planned |
| FR-REP-02 | Vitest reporter streams results during the run | P04-S05 | SC-REP-002 | Planned |
| FR-REP-03 | Retries reported as FLAKY with retry count | P04-S05 | SC-REP-003 | Planned |
| FR-REP-04 | Shard support with a stable `externalRunId` from CI metadata | P04-S05 | SC-REP-004 | Planned |
| FR-REP-05 | CI metadata auto-detection (GitHub, GitLab, Jenkins, CircleCI, generic) | P04-S05 | SC-REP-005 | Planned |
| FR-REP-06 | Never fails or hangs customer CI (network errors, 4xx/5xx, quota, cold start) | P04-S05 | SC-REP-006, SC-REP-007, SC-REP-008 | Planned |
| FR-REP-07 | Truncation, ANSI stripping, optional secret redaction | P04-S05 | SC-REP-009 | Planned |
| FR-REP-08 | Quarantine mode (non-blocking quarantined failures), if Q1 accepts it | P04-S05 | SC-REP-010 | Planned |
| FR-REP-09 | Published to npm with provenance | P10-S07 | SC-REP-011 | Planned |

## QRY — Query APIs

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-QRY-01 | Run list with status/branch/date filters and cursor pagination | P04-S04 | SC-QRY-001, SC-QRY-002 | Planned |
| FR-QRY-02 | Run detail + paginated results (failures first; stack traces only in detail) | P04-S04 | SC-QRY-003 | Planned |
| FR-QRY-03 | Test case detail + history (last N, branch filter) | P04-S04 | SC-QRY-004 | Planned |
| FR-QRY-04 | Test case list with filters and title search | P04-S03, P04-S04 | SC-QRY-005 | Planned |

## RT — Real-time

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-RT-01 | Ticket-based socket authentication | P05-S01, P05-S02 | SC-RT-001, SC-RT-002 | Planned |
| FR-RT-02 | Project room join/leave with membership authorization | P05-S01 | SC-RT-003, SC-RT-004 | Planned |
| FR-RT-03 | Exactly-once event delivery across gateway instances | P05-S01 | SC-RT-005 | Planned |
| FR-RT-04 | Eviction on membership removal/downgrade or project deletion | P05-S01 | SC-RT-006 | Planned |
| FR-RT-05 | Reconnect with backoff, refetch catch-up, dedup by `eventId` | P05-S02, P05-S06 | SC-RT-007, SC-RT-008 | Planned |
| FR-RT-06 | REST polling fallback with degraded-mode banner | P05-S06 | SC-RT-009 | Planned |
| FR-RT-07 | Latency p95 < 200 ms; 1,000 connections per instance | P05-S06, P10-S03 | SC-PERF-002, SC-PERF-003 | Planned |

## DASH — Dashboard UI

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-DASH-01 | Live run progress view (virtualized, on-demand error details, copy) | P05-S03 | SC-DASH-001, SC-DASH-002, SC-E2E-002 | Planned |
| FR-DASH-02 | Run list with summary cards, URL-persisted filters, live inserts | P05-S04 | SC-DASH-003, SC-DASH-004 | Planned |
| FR-DASH-03 | Test case detail with history timeline and duration trend | P05-S05 | SC-DASH-005 | Planned |
| FR-DASH-04 | Connection status indicator and cold-start ("waking up") state | P05-S02, P05-S06 | SC-DASH-006 | Planned |
| FR-DASH-05 | Project overview dashboard cards | P06-S05, P08-S02, P08-S03 | SC-DASH-007 | Planned |

## FLK — Flaky detection

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-FLK-01 | Retry-flake signal | P06-S01 | SC-FLK-001, SC-FLK-002 | Planned |
| FR-FLK-02 | Same-commit disagreement signal | P06-S01 | SC-FLK-003 | Planned |
| FR-FLK-03 | Transition heuristic on tracked branches (min samples) | P06-S01 | SC-FLK-004, SC-FLK-005, SC-FLK-006, SC-FLK-007 | Planned |
| FR-FLK-04 | Decay back to STABLE | P06-S01 | SC-FLK-008 | Planned |
| FR-FLK-05 | Flaky badge, flaky list endpoint, state-change events only | P06-S01 | SC-FLK-009, SC-FLK-010 | Planned |
| FR-FLK-06 | Per-project detection settings (Admin+) | P06-S01 | SC-FLK-011 | Planned |

## QUA — Quarantine

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-QUA-01 | Quarantine a test (Member+) with reason and assignee; one open record per test | P06-S02 | SC-QUA-001, SC-QUA-002, SC-QUA-003 | Planned |
| FR-QUA-02 | State machine transitions with audit trail | P06-S02 | SC-QUA-004, SC-QUA-005, SC-QUA-006 | Planned |
| FR-QUA-03 | Quarantine dashboard with filters and timeline | P06-S04 | SC-QUA-007 | Planned |
| FR-QUA-04 | Bulk transitions with per-item results | P06-S04 | SC-QUA-008 | Planned |
| FR-QUA-05 | SLA markers at 80/100/200% (once each, catch-up safe) | P06-S05 | SC-QUA-009, SC-QUA-010, SC-QUA-011 | Planned |
| FR-QUA-06 | Quarantine metrics (MTTR, resolution rate, open count) | P06-S05, P08-S04 | SC-QUA-012 | Planned |
| FR-QUA-07 | Quarantine CSV export (injection-safe) | P06-S04 | SC-SEC-010 | Planned |

## ANN — Annotations

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-ANN-01 | Comments on test cases (create/edit/delete own; Admin+ delete any) | P06-S03 | SC-ANN-001, SC-ANN-002 | Planned |
| FR-ANN-02 | Sanitized restricted Markdown | P06-S03 | SC-SEC-008 | Planned |
| FR-ANN-03 | @mentions of org members → domain event | P06-S03 | SC-ANN-003, SC-ANN-004 | Planned |
| FR-ANN-04 | User labels on test cases | P06-S03 | SC-ANN-005 | Planned |
| FR-ANN-05 | Real-time sync with optimistic UI | P06-S03 | SC-ANN-006, SC-E2E-003 | Planned |

## NOT — Notifications

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-NOT-01 | Notification router from domain events (dedupe per event+user) | P07-S01 | SC-NOT-001, SC-NOT-002 | Planned |
| FR-NOT-02 | In-app notification center (unread count, mark read, click-through) | P07-S01 | SC-NOT-003, SC-E2E-005 | Planned |
| FR-NOT-03 | Queued templated email with retries and idempotency | P07-S02 | SC-NOT-004 | Planned |
| FR-NOT-04 | One-click unsubscribe (security emails exempt) | P07-S02 | SC-NOT-005 | Planned |
| FR-NOT-05 | Preferences per project × event × channel; project defaults | P07-S03 | SC-NOT-006 | Planned |
| FR-NOT-06 | Digests for noisy events; critical events never delayed | P07-S03 | SC-NOT-007 | Planned |
| FR-NOT-07 | Quiet hours, volume indicator | — | — | Deferred |

## GH — GitHub CI reporting

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-GH-01 | Job summary in `$GITHUB_STEP_SUMMARY` | P07-S04 | SC-GH-001 | Planned |
| FR-GH-02 | Upserted PR comment (no duplicates on re-runs) | P07-S04 | SC-GH-002 | Planned |
| FR-GH-03 | Check run with failure annotations | P07-S04 | SC-GH-003 | Planned |
| FR-GH-04 | Graceful degradation (fork PRs, rate limits, API errors) | P07-S04 | SC-GH-004 | Planned |

## WH — Webhooks

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-WH-01 | Webhook CRUD (Admin+), encrypted secret shown once | P07-S05 | SC-WH-001 | Planned |
| FR-WH-02 | Signed delivery (HMAC over timestamp.body) with event filters | P07-S05 | SC-WH-002 | Planned |
| FR-WH-03 | Retries, auto-disable, delivery log, redeliver, test event | P07-S05 | SC-WH-003, SC-WH-004 | Planned |
| FR-WH-04 | SSRF protection | P07-S05 | SC-SEC-009 | Planned |

## ANL — Analytics

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-ANL-01 | Daily metric aggregation (incremental + nightly reconciliation, backfill) | P08-S01 | SC-ANL-001, SC-ANL-002 | Planned |
| FR-ANL-02 | Pass rate and duration trend charts (accessible, themed) | P08-S02 | SC-ANL-003 | Planned |
| FR-ANL-03 | Top failing / slowest / flakiest leaderboards | P08-S03 | SC-ANL-004 | Planned |
| FR-ANL-04 | MTTR trend and branch comparison | P08-S04 | SC-ANL-005 | Planned |
| FR-ANL-05 | CSV/JSON export (authenticated, streamed, capped) | P08-S04 | SC-ANL-006, SC-SEC-010 | Planned |
| FR-ANL-06 | Public shareable dashboard links | — | — | Deferred |

## PLAN — Plan limits & retention

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-PLAN-01 | Project and member limits (`403 PLAN_LIMIT_REACHED` + upgrade modal) | P03-S03, P03-S04 | SC-PLAN-001, SC-PLAN-002 | Planned |
| FR-PLAN-02 | Usage endpoint and over-quota banner | P04-S06 | SC-PLAN-003 | Planned |
| FR-PLAN-03 | Retention = min(project setting, plan max), chunked deletion | P04-S06 | SC-PLAN-004 | Planned |

## SEC — Cross-cutting security

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-SEC-01 | Tenant isolation on every route (404 cross-tenant, 403 role) | P03-S06, all | SC-SEC-001, SC-SEC-002, SC-SEC-003 | Planned |
| FR-SEC-02 | Tenant-scoped DB client blocks unscoped/cross-tenant operations | P02-S03, P04-S01 | SC-SEC-004 | Planned |
| FR-SEC-03 | Security headers (API helmet; web CSP/HSTS) and CORS allow-list | P03-S06 | SC-SEC-005 | Planned |
| FR-SEC-04 | Secret-free logs (redaction) and audit events | P03-S06 | SC-SEC-006, SC-SEC-007 | Planned |
| FR-SEC-05 | Untrusted content rendered safely (titles, stacks, ANSI, comments) | P05-S03, P06-S03 | SC-SEC-008 | Planned |
| FR-SEC-06 | Dependency audit and secret scanning in CI | P02-S05, P10-S04 | SC-SEC-011 | Planned |

## UX — Design system, states, accessibility

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-UX-01 | Design tokens, primitives, app shell | P02-S06, P09-S01 | SC-UX-001 | Planned |
| FR-UX-02 | Dark/light/system theme without flash; per-user persistence | P02-S06, P09-S02 | SC-UX-002, SC-UX-003 | Planned |
| FR-UX-03 | Loading, empty, error, read-only, plan-limit states on every screen | All UI sprints, P09-S04 | SC-UX-004 | Planned |
| FR-UX-04 | WCAG 2.1 AA, keyboard navigation, screen-reader live regions | All UI sprints, P09-S05 | SC-UX-005, SC-UX-006 | Planned |
| FR-UX-05 | Reduced-motion support | P09-S03 | SC-UX-007 | Planned |

## OPS — Operations & deployment

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-OPS-01 | Health endpoint (DB + Redis) and worker heartbeat | P02-S03 | SC-OPS-001 | Planned |
| FR-OPS-02 | Free-tier profile: same-origin `/api` proxy, in-process workers | P02-S02, P02-S05 | SC-OPS-002, SC-OPS-003 | Planned |
| FR-OPS-03 | Catch-up-safe scheduled jobs (sleep / Redis loss) | P04-S06, P06-S05 | SC-OPS-004, SC-QUA-011 | Planned |
| FR-OPS-04 | CI quality gates incl. traceability check | P02-S05 | SC-OPS-005 | Planned |
| FR-OPS-05 | Paid production environment with backups, alerts, restore drill | P10-S06 | SC-OPS-006 | Planned |

## GTM — Public site & docs

| ID | Feature | Sprint(s) | Scenarios | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-GTM-01 | Landing page meeting §10 marketing targets; pricing from shared plan limits | P11-S01 | SC-GTM-001 | Planned |
| FR-GTM-02 | Docs portal with tested quickstart (≤ 10 min to first live run) | P11-S02 | SC-GTM-002, SC-E2E-001 | Planned |
| FR-GTM-03 | CI guides + OpenAPI reference generated from Zod | P11-S03 | SC-GTM-003 | Planned |
| FR-GTM-04 | SEO metadata, sitemap, privacy-first funnel analytics (no PII) | P11-S04 | SC-GTM-004 | Planned |
