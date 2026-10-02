import { defineConfig } from "prisma/config";

/**
 * Prisma 7 CLI configuration (ADR-004). The CLI (migrate, generate, seed) uses the DIRECT (non-pooled)
 * connection; the runtime client uses @prisma/adapter-pg with the pooled DATABASE_URL (src/client.ts).
 * `prisma generate` does not need a database, so the URL is optional here.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(process.env.DIRECT_URL ? { datasource: { url: process.env.DIRECT_URL } } : {}),
});
