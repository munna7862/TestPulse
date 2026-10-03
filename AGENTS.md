# TestPulse: agent guide

Multi-tenant SaaS for live test-run monitoring, flaky-test triage and quarantine.
Canonical contracts live in [`planning/master/TestPulse_Master_Plan.md`](planning/master/TestPulse_Master_Plan.md)
(§4.2 ingestion, §4.3/§6 events, §5 domain, §7 RBAC and isolation, §8 plan limits, §10 targets). The master
plan wins any conflict; fix the stale file in the same PR. Changing a contract needs an ADR in the same PR.
How we work and why: [`docs/process/ai-delivery-playbook.html`](docs/process/ai-delivery-playbook.html).

## Commands

```text
npm run verify          everything CI's verify job runs, in CI order (run before every push)
npm run dev             web :3000, api :4000
npm run test            unit + integration with coverage thresholds (embedded Postgres, no Docker)
npm run test:e2e        Playwright + axe (required when UI or journeys change)
npm run test:contract   real Redis/BullMQ (CI; locally when REDIS_URL is set)
npm run sync:skills     regenerate .claude/skills after editing .agents/skills
```

## Non-negotiables (each names what enforces it)

1. Tenant data only through `createTenantDb(ctx)`; other tenant = 404, low role = 403.
   Enforced by: `MODEL_SCOPE` runtime guard, isolation tests. Details: `packages/db/AGENTS.md`.
2. Zod schemas from `@testpulse/shared` at every boundary; types via `z.infer`. Enforced by: `fastify-type-provider-zod`.
3. No `any`, no `@ts-ignore`, strict TS. Enforced by: ESLint, `tsconfig.base.json`.
4. Package boundaries: web and ui never import db or server modules; shared stays browser-safe; import workspaces
   as `@testpulse/*`. Enforced by: ESLint.
5. Handlers and workers never touch Socket.IO; publish via `RealtimePublisher` after commit. Details: `apps/api/AGENTS.md`.
6. Never log secrets; render CI-provided text and comments as text. Store only hashes of tokens and keys.
7. Windows dev, Linux CI: no shell-specific npm scripts (use Node scripts); `path.join`/`os.tmpdir()`, never `/tmp`;
   store test paths with POSIX separators; LF line endings, UTF-8 without BOM; no Docker on dev machines.
8. Dependency majors are pinned by ADR-004 (Node 24, TS 6.0, Next 16, Fastify 5, Zod 4, Prisma 7.10, Vitest 5, ESLint 10).
9. Nothing from the non-MVP list (master plan §1): billing, plan gating, SSO, AI diagnosis, Slack bots, public dashboards.
10. Stubs are banned: no `void x;` placeholders, TODO or FIXME in source. Enforced by: ESLint.

## How we work: the slice loop

One slice per session, one PR, at most ~800 changed product lines (CI enforces it).

1. **Brief.** One page in `planning/slices/` from `TEMPLATE.md`: outcome, EARS acceptance criteria, non-goals,
   risks, cited contract sections. The user approves it before code.
2. **Tests first.** Write `*.acceptance.test.ts`, watch each test fail for the right reason, commit.
   Committed acceptance tests are the spec; a hook blocks edits to them. If the spec is wrong, stop and ask.
3. **Build** in small commits, then `npm run verify`.
4. **Independent review** in fresh contexts: `claims-auditor`, `security-reviewer` (auth, tenancy, ingestion,
   webhooks, logging) and `test-auditor` from `.claude/agents/`. Fix only findings that come with proof.
5. **PR** with the evidence table from the PR template. The user merges after reading it.

Agents never mark work `[x]` in `task.md`. An item is done when its PR is merged with green required checks on
the protected `main`. Never claim a result you did not observe, and never skip, `.only` or delete a failing test.
Features have `FR-*` IDs (`docs/product/feature-catalog.md`); scenarios have `SC-*` IDs (`docs/testing/scenario-catalog.md`).
Put the scenario ID in test titles (`it("[SC-ING-004] ...")`) and list FR/SC IDs in the PR description.

## Where things are

```text
apps/api        Fastify 5 server + BullMQ workers; feature modules in src/modules/<feature>   (rules: apps/api/AGENTS.md)
apps/web        Next.js 16 App Router, React Query, Tailwind v4                            (rules: apps/web/AGENTS.md)
packages/shared Zod schemas, event contracts, plan limits; browser-safe                    (rules: packages/shared/AGENTS.md)
packages/db     Prisma schema, migrations, tenant-scoped client                             (rules: packages/db/AGENTS.md)
packages/ui     design-system primitives (Radix + Tailwind)
planning/       master plan, NOW.md (current focus), slices/, older sprint files as reference notes
docs/           ADRs in docs/architecture, API contracts in docs/api, security, testing strategy
```

Skills load on demand from `.claude/skills` (generated from `.agents/skills`): backend, frontend, realtime,
security, testing (SDET), devops, architecture, coding standards.

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
