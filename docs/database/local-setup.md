# Local Database & Redis Setup (Docker-free)

> **Sprint:** P02-S03. Works on Windows PowerShell, macOS, and Linux. No Docker or system-wide PostgreSQL install is required.

## 1. PostgreSQL for development

The repo ships a Docker-free PostgreSQL 16 using the [`embedded-postgres`](https://www.npmjs.com/package/embedded-postgres) binaries (ADR-004 amendment 1).

```powershell
npm run db:start      # terminal 1: starts PostgreSQL 16 on localhost:5433 (data in .pg-dev/, git-ignored). Ctrl+C stops it.
```

Then, in another terminal:

```powershell
Copy-Item apps/api/.env.example apps/api/.env      # bash: cp apps/api/.env.example apps/api/.env
$env:DIRECT_URL = "postgresql://postgres:postgres@localhost:5433/testpulse"   # bash: export DIRECT_URL=...
npm run db:migrate    # apply migrations (prisma migrate deploy)
npm run db:seed       # idempotent demo data: org "acme", 2 users, 2 projects
npm run dev           # web :3000, api :4000 (DATABASE_URL from apps/api/.env)
```

Prefer your own PostgreSQL? Any PostgreSQL 16 works (native install, or a personal Neon branch): point `DATABASE_URL`/`DIRECT_URL` at it and skip `db:start`.

To create a new migration after editing `packages/db/prisma/schema.prisma`:

```powershell
npm run db:migrate:dev -w @testpulse/db -- --name <change_name>
```

Commit the generated `packages/db/prisma/migrations/<timestamp>_<name>/migration.sql`.

## 2. PostgreSQL for tests (automatic)

`npm run test` needs **no setup**. The Vitest global setup (`packages/db/test/global-setup.ts`) does the following:

1. If `DATABASE_URL_TEST` is set (CI service container, or your own server), it uses it as the admin connection.
2. Otherwise it starts a **throwaway** embedded PostgreSQL 16 in a child process on a free port, and deletes it after the run.
3. Each integration test **file** gets a fresh database (`tp_test_w<pool>`) with all migrations applied (`useTestDatabase()` from `@testpulse/db/testing`). Files are isolated without transaction tricks.

Notes:
- The first run downloads nothing extra (the binaries come with `npm install`), but `initdb` takes a few seconds.
- The embedded server must run in a **child process**. `embedded-postgres` installs an exit hook that calls `process.exit(0)`, which would turn failing test runs green if it were loaded inside the Vitest process.

## 3. Redis

Redis is **optional** for local development:
- Without `REDIS_URL`, the API starts and logs "background workers are disabled". `/health` reports `redis: not_configured`.
- Unit tests use `ioredis-mock`.
- The contract suite (`npm run test:contract`) needs real Redis. It runs in CI against a service container. Locally it prints a notice and runs nothing unless `REDIS_URL` is set (e.g. Memurai Developer on Windows, or Redis on macOS/Linux/WSL).

## 4. Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| `db:start` says the port is in use | Set `PG_LOCAL_PORT=5434` (and use that port in your URLs) |
| `P1001: Can't reach database server` | Is `npm run db:start` still running? Check `DIRECT_URL`/`DATABASE_URL` |
| Tests hang at startup on first run | `initdb` is creating the cluster; it can take up to a minute on slow disks |
| Want a clean dev database | Stop `db:start`, delete the `.pg-dev/` folder, start again, then migrate and seed |
