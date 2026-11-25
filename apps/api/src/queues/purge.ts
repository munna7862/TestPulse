import { createTenantDb, type PrismaClient } from "@testpulse/db";

/**
 * Hard-deletes a single soft-deleted organization through the tenant-scoped client (ADR-006 layer 3).
 * Cascade rules on `Organization` remove its `OrgMember` and `Project` rows; live orgs are untouched.
 */
export async function purgeSoftDeletedOrg(db: PrismaClient, orgId: string): Promise<boolean> {
  const { count } = await createTenantDb(db, { orgId }).organization.deleteMany({
    where: { deletedAt: { not: null } },
  });
  return count > 0;
}

/**
 * Hard-deletes a single soft-deleted project scoped to `orgId` through `createTenantDb` (ADR-006 layer 3).
 * Live projects and projects belonging to another org are never matched.
 */
export async function purgeSoftDeletedProject(db: PrismaClient, orgId: string, projectId: string): Promise<boolean> {
  const { count } = await createTenantDb(db, { orgId }).project.deleteMany({
    where: { id: projectId, deletedAt: { not: null } },
  });
  return count > 0;
}

/**
 * Catch-up sweep (master plan §4.4 rule 1): discovers soft-deleted orgs and projects via the system client
 * (ADR-006 layer 3 job bootstrap) and delegates every hard delete to `createTenantDb`.
 */
export async function sweepSoftDeletedTenants(
  db: PrismaClient,
  batchSize = 50,
): Promise<{ orgsPurged: number; projectsPurged: number }> {
  const orgs = await db.organization.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true },
    orderBy: [{ deletedAt: "asc" }, { id: "asc" }],
    take: batchSize,
  });

  let orgsPurged = 0;
  for (const org of orgs) {
    if (await purgeSoftDeletedOrg(db, org.id)) orgsPurged += 1;
  }

  const projects = await db.project.findMany({
    where: { deletedAt: { not: null }, org: { deletedAt: null } },
    select: { id: true, orgId: true },
    orderBy: [{ deletedAt: "asc" }, { id: "asc" }],
    take: batchSize,
  });

  let projectsPurged = 0;
  for (const project of projects) {
    if (await purgeSoftDeletedProject(db, project.orgId, project.id)) projectsPurged += 1;
  }

  return { orgsPurged, projectsPurged };
}
