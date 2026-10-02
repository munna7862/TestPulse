# Testing Strategy

> **Sprint:** P01-S05 · **Owner:** `role-sdet-architect` · **Status:** Draft for review (2026-10)
> Behaviors to prove are listed in the [scenario catalog](scenario-catalog.md) (`SC-*`). This document defines **how** they are tested. Numeric targets come from master plan §10.

## 1. Test pyramid

| Level | Tool | Scope | Location & naming | Share of tests (guide) | Runs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Unit (`U`) | Vitest 5 | Pure logic: Zod schemas, fingerprint, permission map, flaky algorithm, quarantine state machine, plan limits, reporter buffering/CI detection, job processors with fakes | next to the source: `*.test.ts` | ~60% | Every commit (pre-push) and CI |
| Integration (`I`) | Vitest 5 + `app.inject`/Supertest | Fastify routes end to end against **real PostgreSQL** (schema per worker), auth flows, tenant isolation, raw SQL | `apps/api/test/**/*.int.test.ts` | ~25% | CI `verify` |
| Contract (`C`) | Vitest 5 | BullMQ wiring, socket.io redis-adapter + emitter exactly-once, Redis-loss recovery, against **real Redis** | `apps/api/test/**/*.contract.test.ts` | ~3% | CI `verify` (service container); locally when `REDIS_URL` is set |
| Component (`CT`) | Vitest 5 + Testing Library + MSW | React components and hooks: states, forms, live-update hooks with a fake socket | `apps/web/src/**/*.test.tsx` | ~10% | CI `verify` |
| End-to-end (`E`) | Playwright 1.6x + `@axe-core/playwright` | Critical journeys (SC-E2E-001…005), cross-browser smoke, a11y scans | `apps/web/e2e/**/*.spec.ts` | ~2% (but high value) | CI `e2e` job |
| Performance (`P`) | k6 + Vitest bench | Ingestion throughput, WS latency/concurrency, API p95, LCP | `tests/performance/` | — | P04-S06, P05-S06, P10-S03, P10-S06 (on demand) |
| Manual / review (`M`) | — | Screen reader passes, restore drill, provider-terms checks | Checklists in the sprint walkthroughs | — | As scheduled |

## 2. Test infrastructure (Docker-free on developer machines)

### 2.1 PostgreSQL
- **Zero-setup default (P02-S03):** with no `DATABASE_URL_TEST`, the Vitest `globalSetup` starts a throwaway embedded PostgreSQL 16 in a child process ([`docs/database/local-setup.md`](../database/local-setup.md), ADR-004 amendment 1). Alternatively, set `DATABASE_URL_TEST` to a native install, a Neon branch, or the CI service container.
- **Isolation: one fresh database per test file** (`tp_test_w<VITEST_POOL_ID>`, dropped and recreated with all migrations applied) via `useTestDatabase()` from `@testpulse/db/testing`. A `truncateAll()` helper resets tables within a file when needed. (This replaces the earlier schema-per-worker design: same isolation, simpler with Prisma 7 driver adapters.)
- **Do not** use transaction-rollback isolation (it conflicts with application code that opens its own transactions).
- CI uses a `postgres:16` service container.

### 2.2 Redis
- Unit tests: `ioredis-mock` (on `ioredis` 5, ADR-004) for simple commands and pub/sub only.
- Contract tests: real Redis (a CI service container; locally Memurai on Windows, Redis in WSL, or any `REDIS_URL`). Without `REDIS_URL` the contract project is **not run** locally. It is never skipped inside CI, where it is a required job step.

### 2.3 External services
- Email: the `Mailer` test transport captures messages in memory (assert content and links).
- OAuth providers, GitHub API, webhook targets: MSW (`setupServer`) or local HTTP fakes. No real third-party calls in CI.
- Time: inject a `Clock`; use `vi.setSystemTime()` for SLA, expiry, and retention tests.

### 2.4 Test data
- Factories (`packages/db/test/factories/*`) built on Faker with **`faker.seed(<per-test seed>)`**; every test creates its own org and project (parallel-safe).
- A deterministic dev seed (`npm run db:seed`) loads a demo org with runs that include flaky patterns, shards, quarantines, and comments (P02-S03, extended in P04-S01).
- Large datasets for performance tests are generated, never committed.

## 3. Conventions

- **Traceability:** test titles start with the scenario ID: `it("[SC-QUA-003] concurrent quarantine creates one record", …)`. The CI traceability check (P02-S05) compares the catalog's "Automated by" column with test titles.
- **Arrange / act / assert**, one behavior per test, with descriptive names.
- **No sleeps:** use `expect.poll`, `waitFor`, Playwright auto-waiting assertions, and event-driven helpers (`waitForSocketEvent`).
- **Isolation tests are table-driven:** `apps/api/test/security/isolation.table.ts` lists every route with its tenant, role, and expected 404/403. A meta-test compares it to Fastify's registered routes.
- **E2E selectors:** roles and accessible names (`getByRole`), plus `data-testid` only where no accessible handle exists.
- **Snapshots:** visual snapshots are generated on Linux CI only. Text snapshots only for small, stable output (e.g. email templates).

## 4. Coverage policy

| Workspace | Gate (CI fails below) | Target by P10-S01 |
| :--- | :--- | :--- |
| `packages/shared` | 80% lines from P02-S05 | ≥ 90% |
| `packages/db` | 70% from P02-S03 | ≥ 80% |
| `apps/api` (services, plugins, jobs) | 60% from P03-S01, ratcheting | ≥ 80% |
| `apps/web` | 40% components/hooks, ratcheting | ≥ 60% |
| `packages/reporter` | 80% from P04-S05 | ≥ 85% |

The **ratchet** rule: thresholds are raised to current coverage (rounded down) at the end of each phase and never lowered without a PO + SDET note in the walkthrough. Coverage is a signal; the scenario catalog defines what must be tested.

## 5. CI quality gates (P02-S05)

| Job | Steps | Blocking |
| :--- | :--- | :--- |
| `verify` | `npm ci` → lint → typecheck → test (+coverage) → test:contract → build → `npm audit --audit-level=high` → gitleaks → traceability check | Yes |
| `e2e` | Build, start API (in-process workers) + web against service containers → Playwright (Chromium; Firefox/WebKit smoke on main) → axe checks → upload traces on failure | Yes |
| `perf` | k6/bench scenarios | No (manual or nightly), but results are recorded in `performance-baselines.md` |

## 6. Flakiness policy (we practice what we sell)

1. Playwright `retries: 1` in CI only, to capture traces. A test that needed a retry is reported in the job summary.
2. Any flaky test found gets an issue labeled `flaky-test` within 24 h and is fixed or deleted **in the same sprint**. Quarantining our own tests is allowed only with an issue link and a fix date (we dogfood TestPulse once staging exists).
3. New E2E specs must pass 20 consecutive repetitions (`--repeat-each=20`) before merge (SC level `E`, P10-S02).
4. Root causes are recorded in the walkthrough. Common culprits: time, ordering, shared data, animations, network.

## 7. Critical E2E journeys

| ID | Journey | Introduced | Hardened |
| :--- | :--- | :--- | :--- |
| SC-E2E-001 | Golden path: sign-up → first live run (example Playwright project + reporter) | P04-S05/P05-S03 | P10-S02 |
| SC-E2E-002 | Two-browser live run | P05-S06 | P10-S02 |
| SC-E2E-003 | Flaky → quarantine → comment → SLA warning → resolve | P06-S05 | P10-S02 |
| SC-E2E-004 | Invitation | P03-S04 | P10-S02 |
| SC-E2E-005 | Notifications (in-app + email) | P07-S02 | P10-S02 |

## 8. Free-profile considerations

- Performance and latency targets are measured on local or CI infrastructure (SC-PERF-*); hosted free-tier numbers are informational only.
- Staging smoke (`SC-OPS-002`) runs after each staging deploy with a generous first-request timeout (cold start).
- Catch-up behavior (SC-QUA-011, SC-OPS-004) is tested deterministically with a fake clock and Redis flushes, not by waiting for real sleeps.

## 9. Running tests locally (PowerShell or bash)

```powershell
npm run test            # unit + integration + component (needs DATABASE_URL_TEST)
npm run test:contract   # needs REDIS_URL
npm run test:e2e        # builds and starts the apps, then Playwright
npx vitest run apps/api/test/ingest --reporter=verbose   # focus a folder
```
