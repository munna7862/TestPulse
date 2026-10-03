# packages/shared rules

Isomorphic Zod schemas, inferred types, event contracts, plan limits and pure utilities. Root rules in `/AGENTS.md`.

- Browser-safe only: no Node built-ins (`node:*`), `ioredis`, `bullmq`, `pg`, Prisma or `@testpulse/db` (ESLint enforces it).
- Never import from `apps/*`, `packages/db` or `packages/ui`.
- Types come from schemas via `z.infer<typeof Schema>`; do not hand-write parallel interfaces.
- `packages/reporter` bundles what it uses from here at build time, so keep exports tree-shakeable and dependency-free.
