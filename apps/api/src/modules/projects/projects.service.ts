import { createTenantDb, type PrismaClient } from "@testpulse/db";
import {
  checkLimit,
  type CreateProjectBody,
  type OrgRole,
  type Project,
  rolesAtLeast,
  slugify,
  type UpdateProjectBody,
} from "@testpulse/shared";
import { ApiError, isUniqueViolation } from "../../lib/api-error";
import { projectIdOf, type TenantRequestContext } from "../../plugins/tenant-context";

const NOT_FOUND = "Project not found.";
const FORBIDDEN = "Your role does not allow this action.";

interface ProjectRow {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  defaultBranch: string;
  slaDays: number;
  retentionDays: number;
  flakyWindow: number;
  flakyThreshold: number;
  trackedBranches: string[];
  createdAt: Date;
  updatedAt: Date;
}

function toProject(row: ProjectRow, role: OrgRole): Project {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    defaultBranch: row.defaultBranch,
    slaDays: row.slaDays,
    retentionDays: row.retentionDays,
    flakyWindow: row.flakyWindow,
    flakyThreshold: row.flakyThreshold,
    trackedBranches: row.trackedBranches,
    role,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class ProjectService {
  constructor(private readonly db: PrismaClient) {}

  async listForOrg(ctx: TenantRequestContext, slug?: string): Promise<Project[]> {
    const rows = await createTenantDb(this.db, ctx).project.findMany({
      where: { deletedAt: null, ...(slug === undefined ? {} : { slug }) },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return rows.map((row) => toProject(row, ctx.role));
  }

  async get(ctx: TenantRequestContext): Promise<Project> {
    const row = await createTenantDb(this.db, ctx).project.findFirst({
      where: { id: projectIdOf(ctx), deletedAt: null },
    });
    if (!row) throw new ApiError(404, NOT_FOUND);
    return toProject(row, ctx.role);
  }

  /**
   * Locks the org row, re-checks the caller's role and counts live projects in one transaction, so concurrent
   * creates for an org queue on the lock and the plan limit holds (master plan §8, apps/api/AGENTS.md).
   */
  async create(ctx: TenantRequestContext, body: CreateProjectBody): Promise<Project> {
    try {
      const row = await createTenantDb(this.db, ctx).$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ planTier: "FREE" | "PRO" | "ENTERPRISE" }[]>`
          SELECT "planTier" FROM "Organization" WHERE "id" = ${ctx.orgId} AND "deletedAt" IS NULL FOR UPDATE`;
        const org = locked[0];
        if (!org) throw new ApiError(404, "Organization not found.");
        const allowed = await tx.orgMember.count({
          where: { userId: ctx.userId, role: { in: rolesAtLeast(ctx.minRole) } },
        });
        if (allowed !== 1) throw new ApiError(403, FORBIDDEN);

        const live = await tx.project.count({ where: { deletedAt: null } });
        const limit = checkLimit(org.planTier, "projectsPerOrg", live);
        if (!limit.allowed) {
          throw new ApiError(
            403,
            "Your plan's project limit is reached. Contact us or join the Pro waitlist to add more.",
            "PLAN_LIMIT_REACHED",
            { limit: limit.limit, current: live },
          );
        }
        return tx.project.create({
          data: {
            orgId: ctx.orgId,
            name: body.name,
            slug: body.slug ?? slugify(body.name, "project"),
            ...(body.description === undefined ? {} : { description: body.description }),
          },
        });
      });
      return toProject(row, ctx.role);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, "That project slug is already used in this organization.");
      throw error;
    }
  }

  async update(ctx: TenantRequestContext, body: UpdateProjectBody): Promise<Project> {
    const { count } = await createTenantDb(this.db, ctx).project.updateMany({
      where: this.stillAllowed(ctx),
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.description === undefined ? {} : { description: body.description }),
        ...(body.defaultBranch === undefined ? {} : { defaultBranch: body.defaultBranch }),
        ...(body.slaDays === undefined ? {} : { slaDays: body.slaDays }),
        ...(body.retentionDays === undefined ? {} : { retentionDays: body.retentionDays }),
      },
    });
    if (count !== 1) throw await this.refusal(ctx);
    return this.get(ctx);
  }

  /** Soft delete: the project is 404 and stops counting toward the plan limit; S-003 purges its data. */
  async softDelete(ctx: TenantRequestContext): Promise<void> {
    const { count } = await createTenantDb(this.db, ctx).project.updateMany({
      where: this.stillAllowed(ctx),
      data: { deletedAt: new Date() },
    });
    if (count !== 1) throw await this.refusal(ctx);
  }

  /** Writes are conditional on the project being live and the caller still holding the route's minimum role. */
  private stillAllowed(ctx: TenantRequestContext) {
    return {
      id: projectIdOf(ctx),
      deletedAt: null,
      org: { deletedAt: null, members: { some: { userId: ctx.userId, role: { in: rolesAtLeast(ctx.minRole) } } } },
    };
  }

  /** 403 while the project is live (the caller's role changed), 404 once it or its org is gone. */
  private async refusal(ctx: TenantRequestContext): Promise<ApiError> {
    const live = await createTenantDb(this.db, ctx).project.count({
      where: { id: projectIdOf(ctx), deletedAt: null, org: { deletedAt: null } },
    });
    return live === 1 ? new ApiError(403, FORBIDDEN) : new ApiError(404, NOT_FOUND);
  }
}
