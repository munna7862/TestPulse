# packages/db rules

Prisma 7.10 schema, migrations and the tenant-scoped client. Root rules in `/AGENTS.md`.

- Application code uses `createTenantDb(tenantContext)`. `getSystemDb()` is only for global tables (`User`,
  `OAuthAccount`, `Session`, `VerificationToken`), migrations, and jobs that then open a tenant client from the
  job's Zod-validated `orgId`/`projectId`.
- Every model must be classified in `MODEL_SCOPE` (`src/tenant-scope.ts`); unclassified models fail closed.
  Unique-key-only operations (`findUnique`, `update`, `delete`, `upsert`) are banned on the tenant client.
- Only this package imports `@prisma/client` or generated Prisma code (ESLint enforces it).
- Neon: pooled `DATABASE_URL` at runtime, `DIRECT_URL` for migrations. Migrations are additive first
  (expand, deploy, then contract).
- Tests isolate by schema per Vitest worker on embedded Postgres; no Docker, no transaction-rollback isolation.
