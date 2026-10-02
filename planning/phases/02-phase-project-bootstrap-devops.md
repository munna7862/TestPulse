# Phase 02 — Project Bootstrap & DevOps

← [Phase 01](./01-phase-product-architecture-foundation.md) | [Phase 03 →](./03-phase-authentication-multi-tenancy.md)

## Objective

Create a production-ready development environment: repository structure, build tooling, linting, testing infrastructure, job-queue skeleton, design-system foundation, CI/CD pipelines, and deployment targets.

## Outcome

A developer on Windows (no Docker) or macOS/Linux can clone the repository, run `npm install`, start the dev processes, run all test suites, and see a passing CI pipeline — all within the first session. Feature UI in later phases builds on the design-system foundation from day one.

## Scope

- Monorepo initialization (npm workspaces + Turborepo 2, Node 24 LTS)
- Next.js frontend scaffold
- Fastify 5 backend scaffold with `server.ts` (REST + gateway) and `worker.ts` (BullMQ) entrypoints
- Prisma + PostgreSQL (Neon) with the tenant-scoped client and a schema-per-worker test harness
- Redis client and BullMQ skeleton with a real-Redis contract test suite
- Developer tooling (ESLint flat config with boundary rules, Prettier, TypeScript strict)
- Vitest + Playwright test infrastructure with coverage thresholds
- GitHub Actions CI pipeline (with PostgreSQL/Redis service containers)
- Free-tier deployment profile (Vercel Hobby, Render free with in-process workers, Neon free, Render Key Value), Sentry free
- Design-system foundation: tokens, dark/light theming, base primitives, app shell

## Architecture

```text
testpulse/
  apps/
    web/          (Next.js frontend — @testpulse/web)
    api/          (Fastify backend — @testpulse/api: src/server.ts, src/worker.ts)
  packages/
    db/           (Prisma schema + tenant-scoped client — @testpulse/db)
    shared/       (isomorphic schemas, types, events, plan limits — @testpulse/shared)
    ui/           (design system primitives — @testpulse/ui)
    reporter/     (published CI reporter — @testpulse/reporter)
  turbo.json
  package.json
  .gitattributes / .editorconfig / .nvmrc
```

## Testing

- `npm run dev` starts web, api, and worker
- `npm run test` runs unit and integration tests (real PostgreSQL, schema per worker) with coverage
- `npm run test:contract` runs BullMQ/Redis contract tests (CI service container; locally with `REDIS_URL`)
- `npm run test:e2e` runs the Playwright suite (with axe-core checks)
- `npm run lint` and `npm run typecheck` exit cleanly
- GitHub Actions pipeline passes on every PR

## Acceptance Criteria

- [ ] Monorepo structure is initialized with Turborepo; scripts run on PowerShell and bash.
- [ ] Frontend, API, and worker dev processes start without errors.
- [ ] Prisma connects to PostgreSQL and runs migrations via `DIRECT_URL`.
- [ ] Tests run in parallel with isolated schemas and no Docker on the developer machine.
- [ ] Redis client connects and a BullMQ job round-trips in the contract suite.
- [ ] ESLint (including boundary rules) + Prettier + TypeScript strict are enforced.
- [ ] Vitest and Playwright are configured and pass smoke tests.
- [ ] GitHub Actions CI pipeline is green, with coverage thresholds enforced.
- [ ] The free-tier staging environment deploys automatically from main, and Sentry receives errors.
- [ ] Design tokens, dark/light theming, base primitives, and the app shell exist.

## Exit Criteria

The project is "developer-ready" — any contributor can start building features immediately, on the right foundations.

## Sprint Decomposition

- P02-S01: Monorepo initialization and Turborepo setup
- P02-S02: Next.js frontend and Fastify backend scaffolding
- P02-S03: Database, Redis & job queue setup (Prisma + PostgreSQL + Redis + BullMQ)
- P02-S04: Developer tooling and code quality (ESLint, Prettier, TypeScript)
- P02-S05: CI/CD pipeline and deployment targets
- P02-S06: Design system foundation and app shell
