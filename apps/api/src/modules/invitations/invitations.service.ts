import { createTenantDb, type PrismaClient } from "@testpulse/db";
import {
  type AssignableOrgRole,
  checkLimit,
  type CreateInvitationBody,
  type Invitation,
  type Org,
  OrgIdSchema,
  type OrgRole,
  type PlanTier,
  rolesWithPermission,
} from "@testpulse/shared";
import type { ApiEnv } from "../../env";
import { ApiError, isUniqueViolation } from "../../lib/api-error";
import type { Mailer } from "../../lib/mailer";
import type { TenantRequestContext } from "../../plugins/tenant-context";
import type { QueueClient } from "../../queues/registry";
import { generateRandomToken, hashVerificationToken } from "../auth/tokens";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NOT_FOUND = "Invitation not found.";
const FORBIDDEN = "Your role does not allow this action.";

interface InvitationRow {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  invitedById: string;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: { name: string };
}

function asAssignableRole(role: OrgRole): AssignableOrgRole {
  if (role === "OWNER") throw new ApiError(400, "Invalid invitation role.");
  return role;
}

function toInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    orgId: row.orgId,
    email: row.email,
    role: asAssignableRole(row.role),
    invitedById: row.invitedById,
    invitedByName: row.invitedBy.name,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function buildAcceptUrl(webOrigin: string, rawToken: string): string {
  return `${webOrigin.replace(/\/$/, "")}/invitations/accept?token=${encodeURIComponent(rawToken)}`;
}

export interface InvitationServiceOptions {
  db: PrismaClient;
  mailer: Mailer;
  env: ApiEnv;
  queueClient?: QueueClient;
  onEnqueueError?: (error: unknown) => void;
  onMailError?: (error: unknown) => void;
  now?: () => Date;
}

export class InvitationService {
  private readonly db: PrismaClient;
  private readonly mailer: Mailer;
  private readonly env: ApiEnv;
  private readonly queueClient?: QueueClient;
  private readonly onEnqueueError?: (error: unknown) => void;
  private readonly onMailError?: (error: unknown) => void;
  private readonly now: () => Date;

  constructor(options: InvitationServiceOptions) {
    this.db = options.db;
    this.mailer = options.mailer;
    this.env = options.env;
    if (options.queueClient) this.queueClient = options.queueClient;
    if (options.onEnqueueError) this.onEnqueueError = options.onEnqueueError;
    if (options.onMailError) this.onMailError = options.onMailError;
    this.now = options.now ?? (() => new Date());
  }

  private async lockOrgAndCheckInviter(
    tx: Pick<ReturnType<typeof createTenantDb>, "$queryRaw" | "orgMember">,
    ctx: TenantRequestContext,
  ): Promise<{ planTier: PlanTier; name: string }> {
    const locked = await tx.$queryRaw<{ planTier: PlanTier; name: string }[]>`
      SELECT "planTier", "name" FROM "Organization" WHERE "id" = ${ctx.orgId} AND "deletedAt" IS NULL FOR UPDATE`;
    const org = locked[0];
    if (!org) throw new ApiError(404, "Organization not found.");

    const allowed = await tx.orgMember.count({
      where: { userId: ctx.userId, role: { in: [...rolesWithPermission("member.invite")] } },
    });
    if (allowed !== 1) throw new ApiError(403, FORBIDDEN);
    return org;
  }

  private async dispatchEmail(
    to: string,
    inviterName: string,
    orgName: string,
    role: AssignableOrgRole,
    rawToken: string,
  ): Promise<void> {
    try {
      await this.mailer.sendInvitationEmail({
        to,
        inviterName,
        orgName,
        role,
        token: rawToken,
        acceptUrl: buildAcceptUrl(this.env.WEB_ORIGIN, rawToken),
      });
    } catch (error) {
      this.onMailError?.(error);
    }
  }

  private async enqueueInvited(orgId: string, invitationId: string, invitedById: string, role: AssignableOrgRole) {
    if (!this.queueClient) return;
    try {
      await this.queueClient.enqueue("member.invited", { orgId, invitationId, invitedById, role });
    } catch (error) {
      this.onEnqueueError?.(error);
    }
  }

  /**
   * Creates a single-use 7-day invitation under an Organization FOR UPDATE lock so concurrent invites
   * cannot exceed `PLAN_LIMITS[tier].membersPerOrg` (master plan §8). Sends mail and emits `member.invited`
   * after commit.
   */
  async create(ctx: TenantRequestContext, inviterName: string, body: CreateInvitationBody): Promise<Invitation> {
    const normalizedEmail = body.email.toLowerCase();
    const now = this.now();
    const rawToken = generateRandomToken();
    const tokenHash = hashVerificationToken(rawToken);
    const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);

    const { invitation, orgName } = await createTenantDb(this.db, ctx).$transaction(async (tx) => {
      const org = await this.lockOrgAndCheckInviter(tx, ctx);

      const existingMember = await tx.orgMember.findFirst({
        where: { user: { email: { equals: normalizedEmail, mode: "insensitive" } } },
        select: { id: true },
      });
      if (existingMember) throw new ApiError(409, "That user is already a member of this organization.");

      const activeFilter = { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } };
      const existingInvite = await tx.invitation.findFirst({
        where: { email: normalizedEmail, ...activeFilter },
        select: { id: true },
      });
      if (existingInvite) throw new ApiError(409, "An active invitation already exists for this email.");

      const memberCount = await tx.orgMember.count();
      const pendingCount = await tx.invitation.count({ where: activeFilter });
      const current = memberCount + pendingCount;
      const limit = checkLimit(org.planTier, "membersPerOrg", current);
      if (!limit.allowed) {
        throw new ApiError(
          403,
          "Your plan's member limit is reached. Contact us or join the Pro waitlist to invite more.",
          "PLAN_LIMIT_REACHED",
          { limit: limit.limit, current },
        );
      }

      const row = await tx.invitation.create({
        data: {
          orgId: ctx.orgId,
          email: normalizedEmail,
          role: body.role,
          tokenHash,
          invitedById: ctx.userId,
          expiresAt,
        },
        include: { invitedBy: { select: { name: true } } },
      });

      return { invitation: toInvitation(row), orgName: org.name };
    });

    await this.dispatchEmail(invitation.email, inviterName, orgName, invitation.role, rawToken);
    await this.enqueueInvited(ctx.orgId, invitation.id, ctx.userId, invitation.role);
    return invitation;
  }

  /** Lists active pending invitations in this organization without exposing token hashes. */
  async list(ctx: TenantRequestContext): Promise<Invitation[]> {
    const now = this.now();
    const rows = await createTenantDb(this.db, ctx).invitation.findMany({
      where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      include: { invitedBy: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return rows.map(toInvitation);
  }

  /** Rotates `tokenHash`, extends expiry by 7 days, invalidates the old link, and emails the new link. */
  async resend(ctx: TenantRequestContext, inviterName: string, invitationId: string): Promise<Invitation> {
    if (!OrgIdSchema.safeParse(invitationId).success) {
      throw new ApiError(404, NOT_FOUND);
    }
    const now = this.now();
    const rawToken = generateRandomToken();
    const tokenHash = hashVerificationToken(rawToken);
    const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);

    const { invitation, orgName } = await createTenantDb(this.db, ctx).$transaction(async (tx) => {
      const org = await this.lockOrgAndCheckInviter(tx, ctx);
      const row = await tx.invitation.findFirst({
        where: { id: invitationId },
        include: { invitedBy: { select: { name: true } } },
      });
      if (!row) throw new ApiError(404, NOT_FOUND);
      if (row.acceptedAt !== null) throw new ApiError(409, "This invitation has already been accepted.");
      if (row.revokedAt !== null) throw new ApiError(409, "This invitation has been revoked.");
      if (row.expiresAt <= now) {
        throw new ApiError(409, "This invitation has expired. Send a new invitation instead.");
      }

      const updated = await tx.invitation.updateMany({
        where: { id: invitationId, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { tokenHash, expiresAt },
      });
      if (updated.count !== 1) throw new ApiError(409, "Invitation status changed; try again.");

      return { invitation: toInvitation({ ...row, expiresAt }), orgName: org.name };
    });

    await this.dispatchEmail(invitation.email, inviterName, orgName, invitation.role, rawToken);
    return invitation;
  }

  /** Revokes a pending invitation, immediately freeing its member limit slot. */
  async revoke(ctx: TenantRequestContext, invitationId: string): Promise<void> {
    if (!OrgIdSchema.safeParse(invitationId).success) {
      throw new ApiError(404, NOT_FOUND);
    }
    const now = this.now();

    await createTenantDb(this.db, ctx).$transaction(async (tx) => {
      await this.lockOrgAndCheckInviter(tx, ctx);
      const row = await tx.invitation.findFirst({
        where: { id: invitationId },
        select: { acceptedAt: true, revokedAt: true },
      });
      if (!row || row.revokedAt !== null) throw new ApiError(404, NOT_FOUND);
      if (row.acceptedAt !== null) throw new ApiError(409, "This invitation has already been accepted.");

      const revoked = await tx.invitation.updateMany({
        where: { id: invitationId, acceptedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) throw new ApiError(409, "Invitation status changed; try again.");
    });
  }

  /**
   * Accepts an invitation for the authenticated verified user. Uses the unscoped `db` client (ADR-006
   * token-lookup exception) because the invitee is not yet a member of the target organization.
   */
  async accept(user: { id: string; email: string }, rawToken: string): Promise<Org> {
    const tokenHash = hashVerificationToken(rawToken);
    const now = this.now();

    return this.db.$transaction(async (tx) => {
      const inv = await tx.invitation.findFirst({
        where: { tokenHash },
        include: { org: true },
      });
      if (!inv || inv.org.deletedAt !== null) {
        throw new ApiError(400, "This invitation link is invalid.", "INVALID_TOKEN");
      }
      if (inv.revokedAt !== null) {
        throw new ApiError(400, "This invitation has been revoked.", "INVITATION_REVOKED");
      }
      if (inv.acceptedAt !== null) {
        throw new ApiError(409, "This invitation has already been accepted.");
      }
      if (inv.expiresAt <= now) {
        throw new ApiError(400, "This invitation has expired.", "INVITATION_EXPIRED");
      }
      if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
        throw new ApiError(403, "This invitation was sent to a different email address.");
      }
      const role = asAssignableRole(inv.role);

      const claimed = await tx.invitation.updateMany({
        where: { id: inv.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) {
        throw new ApiError(409, "This invitation has already been accepted.");
      }

      try {
        await tx.orgMember.create({ data: { orgId: inv.orgId, userId: user.id, role } });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiError(409, "You are already a member of this organization.");
        }
        throw error;
      }

      return {
        id: inv.org.id,
        name: inv.org.name,
        slug: inv.org.slug,
        planTier: inv.org.planTier,
        role,
        createdAt: inv.org.createdAt.toISOString(),
      };
    });
  }
}
