import type { PrismaClient } from "./generated/prisma/client";
import { scopeTenantArgs, type TenantContext } from "./tenant-scope";

/**
 * Tenant-scoped client (ADR-006 layer 3). Application code uses ONLY this client for tenant data:
 * every operation is rewritten by `scopeTenantArgs` or rejected.
 */
export function createTenantDb(base: PrismaClient, ctx: TenantContext) {
  return base.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scoped = scopeTenantArgs(model, operation, args, ctx);
          return query(scoped as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof createTenantDb>;
