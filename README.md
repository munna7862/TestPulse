# TestPulse

[![CI Quality Gate](https://github.com/munna7862/TestPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/munna7862/TestPulse/actions/workflows/ci.yml)

TestPulse is a multi-tenant SaaS for watching test runs live and triaging flaky tests: a CI reporter streams results to a dashboard, tests get a flakiness score, and flaky tests move through a quarantine lifecycle.

## Status

**In development, Phase 03 of 11 (Authentication and multi-tenancy).** There is no release and no public deployment yet.

| Phase | State |
| --- | --- |
| 01 Product and architecture foundation | Done (PRD, UX, ADRs, security model, testing strategy) |
| 02 Project bootstrap and DevOps | Done (monorepo, tooling, CI quality gate, design system) |
| 03 Authentication and multi-tenancy | In progress |
| 04-11 Ingestion, real-time dashboard, flaky detection, notifications, analytics, polish, release, launch | Planned |

What works today (API + web):

- Email registration with verification, password login, password reset, session cookies with refresh-token rotation.
- Google and GitHub OAuth sign-in with safe account linking.
- Auth rate limiting, timing parity on login, single-use tokens.
- Organizations with tenant context, and projects with plan limits and project-scoped tenancy.
- Web app shell, auth pages and a design-system component catalog.

Not built yet: invitations and RBAC, API keys, the test-run ingestion API, the CI reporter (`packages/reporter` is a placeholder), the real-time Socket.IO dashboard, flakiness scoring and quarantine. `planning/NOW.md` tracks the current slice.

## Tech stack

- **Web**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **API**: Fastify 5, Zod 4, `@fastify/jwt`, argon2, Arctic (OAuth), BullMQ on Redis (ioredis), Pino
- **Data**: PostgreSQL 16 via Prisma 7; `embedded-postgres` for Docker-free local development
- **Tooling**: TypeScript 6, npm workspaces + Turborepo, ESLint 10, Prettier, Husky, lint-staged, commitlint
- **Tests**: Vitest (unit, integration, real-Redis contract tests), Playwright + axe-core (E2E smoke and accessibility)
- **Runtime**: Node.js 24 LTS (`.nvmrc`)

## Quick start

Prerequisites: Node.js 24, npm 10+, Redis 7 (needed for workers and `test:contract`). PostgreSQL is optional locally because `npm run db:start` runs an embedded PostgreSQL 16.

```bash
git clone https://github.com/munna7862/TestPulse.git
cd TestPulse
npm install
cp .env.example .env

npm run db:start      # embedded PostgreSQL on port 5433, keep this terminal open
npm run db:migrate    # in a second terminal
npm run dev           # web on http://localhost:3000, API on http://localhost:4000
```

The API serves auth under `/api/v1/auth`. See `docs/database/local-setup.md` and `docs/ops/environment.md` for every variable.

## Project structure

```
apps/
  web/                Next.js app: auth pages, app shell, runs and settings pages, Playwright E2E tests
  api/                Fastify API: auth, OAuth, orgs, projects, tenant-context plugin, BullMQ worker
packages/
  db/                 Prisma schema, migrations, seed, tenant-scoped client, embedded Postgres script
  shared/             Zod schemas, API contracts, env parsing, shared utilities
  ui/                 Shared React components
  reporter/           Placeholder for the CI reporter (not implemented)
docs/                 PRD, ADRs, API, database, security, testing and UX docs
planning/             Master plan, 11 phase blueprints, sprints, slices, NOW.md
scripts/              Quality gates: traceability, PR size, audit, skills sync
```

## Tests and CI

```bash
npm run lint                 # ESLint with architecture boundary rules
npm run typecheck
npm run format:check
npm run test                 # Vitest unit and integration tests with coverage
npm run test:contract        # BullMQ and Redis contract tests against a real Redis
npm run test:e2e             # Playwright smoke, auth, OAuth and accessibility tests
npm run check:traceability   # every automated scenario in docs/testing/scenario-catalog.md exists
npm run build
```

`.github/workflows/ci.yml` (CI Quality Gate) runs on pushes and pull requests: PR size budget, lint, typecheck, format, skills sync, traceability, unit and contract tests, production build, dependency audit, Gitleaks secret scan, then a Playwright E2E job against a migrated database.

Two more workflows exist but are not active yet: `deploy-staging.yml` waits for staging secrets to be configured, and `keep-alive.yml` skips until a staging URL is set.

## Deployment target

The free-tier profile (until feature complete) is Vercel for the web app, Render for the API and workers, Neon for PostgreSQL and Upstash or Render Key Value for Redis. Details are in `docs/ops/free-tier-deployment.md` and ADR-003.
