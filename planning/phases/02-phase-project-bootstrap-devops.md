# Phase 02 — Project Bootstrap & DevOps

← [Phase 01](./01-phase-product-architecture-foundation.md) | [Phase 03 →](./03-phase-authentication-multi-tenancy.md)

## Objective

Create a production-ready development environment: repository structure, build tooling, linting, testing infrastructure, CI/CD pipelines, and deployment targets.

## Outcome

A developer can clone the repository, run `npm install`, start the dev server, run all test suites, and see a passing CI pipeline — all within the first session.

## Scope

- Monorepo initialization (Turborepo)
- Next.js 15 frontend scaffold
- Fastify backend API scaffold
- Prisma schema initialization with PostgreSQL
- Redis client setup
- Developer tooling (ESLint, Prettier, TypeScript strict)
- Vitest + Playwright test infrastructure
- GitHub Actions CI pipeline
- Vercel + Railway deployment targets
- AGENTS.md workspace integration

## Architecture

```text
testpulse/
  apps/
    web/          (Next.js 15 frontend — @testpulse/web)
    api/          (Fastify backend — @testpulse/api)
  packages/
    db/           (Prisma schema + client — @testpulse/db)
    shared/       (types, utils, constants — @testpulse/shared)
    ui/           (shared component library — @testpulse/ui)
    reporter/     (standalone CI reporter — @testpulse/reporter)
  turbo.json
  package.json
```

## Testing

- `npm run dev` starts both frontend and backend
- `npm run test` runs all unit tests
- `npm run test:e2e` runs Playwright suite
- `npm run lint` exits cleanly
- `npm run typecheck` exits cleanly
- GitHub Actions pipeline passes on push

## Acceptance Criteria

- [ ] Monorepo structure is initialized with Turborepo.
- [ ] Frontend and backend dev servers start without errors.
- [ ] Prisma connects to PostgreSQL and runs migrations.
- [ ] Redis client connects and performs basic operations.
- [ ] ESLint + Prettier + TypeScript strict are enforced.
- [ ] Vitest and Playwright are configured and pass smoke tests.
- [ ] GitHub Actions CI pipeline is green.
- [ ] Deployment targets are configured (Vercel + Railway).

## Exit Criteria

The project is "developer-ready" — any contributor can start building features immediately.

## Sprint Decomposition

- P02-S01: Monorepo initialization and Turborepo setup
- P02-S02: Next.js frontend and Fastify backend scaffolding
- P02-S03: Database setup (Prisma + PostgreSQL + Redis)
- P02-S04: Developer tooling and code quality (ESLint, Prettier, TypeScript)
- P02-S05: CI/CD pipeline and deployment targets
