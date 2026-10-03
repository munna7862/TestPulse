import { createTenantDb, type PrismaClient } from "@testpulse/db";
import { type CreateOrgBody, type Org, type OrgMember, type OrgRole, rolesAtLeast, slugify } from "@testpulse/shared";
import type { TenantRequestContext } from "../../plugins/tenant-context";

/** Domain error carrying an HTTP status; the shared error handler maps it to the envelope code. */
export class OrgError extends Error {
  constructor(
    readonly statusCode: 400 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = "OrgError";
  }
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  planTier: Org["planTier"];
  createdAt: Date;
}

function toOrg(org: OrgRow, role: OrgRole): Org {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    planTier: org.planTier,
    role,
    createdAt: org.createdAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export class OrgService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Creates the org and its single OWNER membership in one statement. The tenant does not exist yet, so this is
   * the one write that uses the system client (MODEL_SCOPE: Organization is created via systemDb).
   */
  async create(userId: string, body: CreateOrgBody): Promise<Org> {
    try {
      const org = await this.db.organization.create({
        data: {
          name: body.name,
          slug: body.slug ?? slugify(body.name),
          members: { create: { userId, role: "OWNER" } },
        },
      });
      return toOrg(org, "OWNER");
    } catch (error) {
      if (isUniqueViolation(error)) throw new OrgError(409, "That organization slug is already taken.");
      throw error;
    }
  }

  /**
   * The caller's own memberships across orgs. Keyed by the authenticated user, so it is the one cross-tenant read
   * and cannot use a tenant client; it returns only rows where `userId` is the caller.
   */
  async listForUser(userId: string, slug?: string): Promise<Org[]> {
    const memberships = await this.db.orgMember.findMany({
      where: { userId, org: { deletedAt: null, ...(slug === undefined ? {} : { slug }) } },
      include: { org: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return memberships.map((membership) => toOrg(membership.org, membership.role));
  }

  async get(ctx: TenantRequestContext): Promise<Org> {
    const org = await createTenantDb(this.db, ctx).organization.findFirst({ where: { deletedAt: null } });
    if (!org) throw new OrgError(404, "Organization not found.");
    return toOrg(org, ctx.role);
  }

  /**
   * Writes to the org row are conditional on the caller still holding the route's minimum role, so a role lost
   * between the tenant check and the write (a transfer, later a demotion) is not used.
   */
  private stillAllowed(ctx: TenantRequestContext) {
    return { deletedAt: null, members: { some: { userId: ctx.userId, role: { in: rolesAtLeast(ctx.minRole) } } } };
  }

  /** 403 while the org is live (the caller's role changed), 404 once it is gone. */
  private async refusal(ctx: TenantRequestContext): Promise<OrgError> {
    const live = await createTenantDb(this.db, ctx).organization.count({ where: { deletedAt: null } });
    return live === 1
      ? new OrgError(403, "Your role does not allow this action.")
      : new OrgError(404, "Organization not found.");
  }

  async rename(ctx: TenantRequestContext, name: string): Promise<Org> {
    const { count } = await createTenantDb(this.db, ctx).organization.updateMany({
      where: this.stillAllowed(ctx),
      data: { name },
    });
    if (count !== 1) throw await this.refusal(ctx);
    return this.get(ctx);
  }

  /** Soft delete: every org route returns 404 from now on; the purge job (S-002) removes the data. */
  async softDelete(ctx: TenantRequestContext): Promise<void> {
    const { count } = await createTenantDb(this.db, ctx).organization.updateMany({
      where: this.stillAllowed(ctx),
      data: { deletedAt: new Date() },
    });
    if (count !== 1) throw await this.refusal(ctx);
  }

  async listMembers(ctx: TenantRequestContext): Promise<OrgMember[]> {
    const members = await createTenantDb(this.db, ctx).orgMember.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      joinedAt: member.createdAt.toISOString(),
    }));
  }

  /**
   * Owner → Admin and Admin → Owner in one transaction. The conditional demotion locks the Owner's row, so a
   * concurrent transfer waits, re-checks `role = OWNER`, matches nothing and is rejected: exactly one Owner remains.
   */
  async transferOwnership(ctx: TenantRequestContext, targetUserId: string): Promise<Org> {
    if (targetUserId === ctx.userId) {
      throw new OrgError(400, "Ownership can only be transferred to another member who is an Admin.");
    }
    await createTenantDb(this.db, ctx).$transaction(async (tx) => {
      const demoted = await tx.orgMember.updateMany({
        where: { userId: ctx.userId, role: "OWNER" },
        data: { role: "ADMIN" },
      });
      if (demoted.count !== 1) throw new OrgError(403, "Your role does not allow this action.");

      const target = await tx.orgMember.findFirst({ where: { userId: targetUserId }, select: { role: true } });
      if (!target) throw new OrgError(404, "Member not found.");
      if (target.role !== "ADMIN") {
        throw new OrgError(400, "Ownership can only be transferred to another member who is an Admin.");
      }

      const promoted = await tx.orgMember.updateMany({
        where: { userId: targetUserId, role: "ADMIN" },
        data: { role: "OWNER" },
      });
      if (promoted.count !== 1) throw new OrgError(409, "The member's role changed; try again.");
    });
    return this.get({ ...ctx, role: "ADMIN" });
  }
}
