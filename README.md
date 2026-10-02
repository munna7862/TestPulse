# TestPulse

[![CI Quality Gate](https://github.com/munna7862/TestPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/munna7862/TestPulse/actions/workflows/ci.yml)
[![Deploy Staging](https://github.com/munna7862/TestPulse/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/munna7862/TestPulse/actions/workflows/deploy-staging.yml)
![Node.js](https://img.shields.io/badge/node-24%20LTS-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

> **Real-time test execution monitoring, collaborative flaky test triage, and automated quarantine lifecycle management.**

---

## 🧭 Overview & Topology

TestPulse is a multi-tenant SaaS platform built for engineering teams who demand complete visibility into their test suites. It pairs deep test-runner integration with live streaming updates, automated flakiness scoring, and quarantine lifecycle rules.

```text
testpulse/
├── apps/
│   ├── web/               # Next.js 16 (App Router, React 19, Tailwind v4, Radix UI)
│   └── api/               # Fastify 5 (REST + Socket.IO server & BullMQ workers)
├── packages/
│   ├── shared/            # Isomorphic: Zod schemas, event contracts, domain models, pure utils
│   ├── db/                # Prisma schema, migrations, tenant-scoped client (createTenantDb)
│   ├── ui/                # Shared design system primitive components
│   └── reporter/          # Published CI reporter npm package (Playwright + Vitest)
├── .github/workflows/     # CI quality gates, staging deployment, and keep-alive workflows
├── docs/                  # Architecture, PRD, API, Database, Testing, Security, Ops docs
└── scripts/               # Quality gates (traceability check) and dev utilities
```

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: `24 LTS` (see `.nvmrc`)
* **npm**: `v10+`
* **PostgreSQL**: `16+` (or Neon serverless branch)
* **Redis**: `7+` (optional for unit tests; required for `test:contract` and background workers)

### Installation
```bash
# Clone the repository
git clone https://github.com/munna7862/TestPulse.git
cd TestPulse

# Install dependencies across all workspaces
npm install

# Copy environment template
cp .env.example .env
```

### Local Development
```bash
# Start local development database (Docker-free / portable)
npm run db:start

# Run migrations and generate Prisma client
npm run db:migrate

# Start all workspaces concurrently in development mode
npm run dev
```

The web application runs at `http://localhost:3000` and the API runs at `http://localhost:4000`.

---

## 🚦 Quality Gates

TestPulse enforces strict zero-regression quality gates verified in both local pre-commit hooks and GitHub Actions CI:

```bash
npm run check:traceability   # Verify 100% of automated scenarios in scenario-catalog.md exist
npm run lint                 # ESLint 10 with architecture boundary enforcement
npm run typecheck            # Strict TypeScript compilation across all workspaces
npm run format:check         # Prettier code formatting verification
npm run test                 # Vitest unit and integration test suites
npm run test:contract        # Real-Redis contract and BullMQ job processing tests
npm run test:e2e             # Playwright end-to-end smoke & accessibility test suite
npm run build                # Turborepo production build of all packages and apps
```

---

## ☁️ Deployment Profile

TestPulse is architected for dual-target deployment (Free-Tier profile until feature-complete, Paid-Tier profile for scale):

* **Web**: Vercel Hobby (`apps/web` Next.js 16 App Router) with same-origin `/api` rewrites preserving first-party cookies.
* **API & Workers**: Render Free Web Service (`apps/api` Fastify 5 + Socket.IO + BullMQ with `RUN_WORKERS_IN_PROCESS=true`).
* **Database**: Neon Serverless PostgreSQL 16 (pooled connection for runtime, direct URL for migrations).
* **Redis**: Render Key Value / Upstash Redis for distributed cache and BullMQ job scheduling.

Refer to [docs/ops/environment.md](docs/ops/environment.md) for full configuration variables.

---

## 📄 License

MIT © [TestPulse Team](https://github.com/munna7862/TestPulse)
