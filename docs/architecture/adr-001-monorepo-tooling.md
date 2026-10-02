# ADR-001: Monorepo Tooling — npm Workspaces + Turborepo 2

## Status
Accepted (P01-S03, 2026-10)

## Context
TestPulse has two apps (web, api) and four packages (shared, db, ui, reporter) that share Zod schemas and types. The primary development machines run Windows PowerShell; CI runs Linux. Every planning document already uses `npm run …` commands.

## Decision
- Use **npm workspaces** (lockfile `package-lock.json`) with **Turborepo 2** (`turbo.json` `tasks` syntax) for task orchestration and caching.
- Pin Node with `.nvmrc` (Node 24 LTS) and `engines`.
- Root scripts delegate to `turbo run <task>`; no shell-specific syntax (use `cross-env`, `rimraf`, Node scripts).
- Internal packages are referenced as `"@testpulse/shared": "*"` workspace dependencies. Libraries compile with `tsc`/`tsup`; the reporter bundles `shared` (ADR-004).

## Consequences
- **Positive:** zero extra tooling to install on Windows; one lockfile; remote/local caching via Turborepo; consistent with every existing doc and prompt.
- **Negative / trade-offs:** npm workspaces hoist dependencies, so phantom-dependency mistakes are possible. Install is slower than pnpm.
- **Mitigation:** ESLint `import/no-extraneous-dependencies` per workspace; `npm ci` in CI with caching; declare every used dependency in the importing workspace's `package.json`.

## Alternatives considered
- **pnpm + Turborepo:** stricter isolation and faster installs, but adds a tool and changes every command in the docs. Revisit if hoisting causes real problems.
- **Nx:** more powerful, but heavier configuration than needed for six workspaces.
