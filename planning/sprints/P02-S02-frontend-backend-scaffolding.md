# Phase 02 — Sprint 02: Next.js Frontend and Fastify Backend Scaffolding

## Sprint Objective

Scaffold the Next.js 15 frontend application and Fastify backend API server within the monorepo.

## Dependencies

P02-S01 monorepo initialized.

## Scope

### Granular Implementation Tasks

1. Scaffold Next.js 15 with App Router in apps/web (TypeScript, Tailwind CSS v4).
2. Scaffold Fastify API server in apps/api (TypeScript, Zod validation).
3. Configure shared TypeScript config (tsconfig.base.json) across workspaces.
4. Set up path aliases for clean imports.
5. Create a minimal health check route on both frontend and backend.
6. Verify hot-reload works for both apps in development.
7. Configure environment variable loading (.env.local, .env.example).

## Expected Files / Areas

`apps/web/`, `apps/api/`, `tsconfig.base.json`

## Testing & Verification

Start both dev servers, verify health routes respond, verify hot-reload works.

## Acceptance Criteria

- [ ] Next.js dev server starts without errors.
- [ ] Fastify API server starts and responds to health check.
- [ ] TypeScript strict mode is enabled in both apps.
- [ ] Hot-reload works for both frontend and backend.
- [ ] Environment variables load correctly from .env files.

## Risks / Guardrails

Version conflicts between Next.js and Fastify dependencies; incorrect TypeScript config inheritance.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 02, Sprint 02: Next.js Frontend and Fastify Backend Scaffolding.

OBJECTIVE:
Scaffold the Next.js 15 frontend application and Fastify backend API server within the monorepo.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Scaffold Next.js 15 with App Router in apps/web (TypeScript, Tailwind CSS v4).
2. Scaffold Fastify API server in apps/api (TypeScript, Zod validation).
3. Configure shared TypeScript config (tsconfig.base.json) across workspaces.
4. Set up path aliases for clean imports.
5. Create a minimal health check route on both frontend and backend.
6. Verify hot-reload works for both apps in development.
7. Configure environment variable loading (.env.local, .env.example).

TEST:
Start both dev servers, verify health routes respond, verify hot-reload works.

ACCEPTANCE:
- [ ] Next.js dev server starts without errors.
- [ ] Fastify API server starts and responds to health check.
- [ ] TypeScript strict mode is enabled in both apps.
- [ ] Hot-reload works for both frontend and backend.
- [ ] Environment variables load correctly from .env files.

GUARDRAILS:
Version conflicts between Next.js and Fastify dependencies; incorrect TypeScript config inheritance.

At completion:
- Run the relevant verification commands.
- Report changed files.
- Report tests executed and results.
- Report known limitations.
- Do not suppress or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Tests added or updated for changed behavior.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Relevant tests pass.
- [ ] Build passes when applicable.
- [ ] Acceptance criteria verified.
- [ ] Git diff reviewed.
- [ ] Documentation updated when behavior or architecture changed.
- [ ] Sprint can be handed to the next sprint without hidden manual steps.
