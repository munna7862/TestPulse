import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export type { PrismaClient };

/**
 * Creates a Prisma 7 client using the node-postgres driver adapter (ADR-004).
 * Runtime code passes the POOLED `DATABASE_URL`; migrations use `DIRECT_URL` via prisma.config.ts.
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

let systemClient: PrismaClient | undefined;

/**
 * Unscoped client for identity tables, API-key lookup, migrations and job bootstrap ONLY
 * (ADR-006 layer 3). Every other use must go through `createTenantDb`.
 */
export function getSystemDb(): PrismaClient {
  if (!systemClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    systemClient = createPrismaClient(url);
  }
  return systemClient;
}

export async function disconnectSystemDb(): Promise<void> {
  await systemClient?.$disconnect();
  systemClient = undefined;
}

/** Lightweight connectivity probe used by `/health`. Never throws. */
export async function checkDatabase(db: PrismaClient, timeoutMs = 2_000): Promise<"up" | "down"> {
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return "up";
  } catch {
    return "down";
  }
}
