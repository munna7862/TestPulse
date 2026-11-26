import {
  type AssignableOrgRole,
  AssignableOrgRoleSchema,
  can,
  checkLimit,
  type CreateInvitationBody,
  CreateInvitationBodySchema,
  type Invitation,
  InvitationSchema,
  type Org,
  type OrgMember,
  OrgMemberSchema,
  type OrgRole,
  OrgSchema,
  PLAN_LIMITS,
  type PlanTier,
} from "@testpulse/shared";
import { z } from "zod";
import { ApiClientError, type ApiClientOptions, createApiClient } from "./api-client";
import { ApiError as AuthApiError } from "./auth-client";
import type { ValidationResult } from "./workspace";

export const INVITE_ROLE_OPTIONS: readonly AssignableOrgRole[] = ["ADMIN", "MEMBER", "VIEWER"];

export interface MemberPermissions {
  invite: boolean;
  changeRole: boolean;
  remove: boolean;
  leave: boolean;
}

export interface MemberQuotaSummary {
  used: number;
  limit: number | null;
  remaining: number | null;
  atLimit: boolean;
  label: string;
}

export interface MembersClient {
  listMembers: (orgId: string, signal?: AbortSignal) => Promise<OrgMember[]>;
  listInvitations: (orgId: string, signal?: AbortSignal) => Promise<Invitation[]>;
  createInvitation: (orgId: string, body: CreateInvitationBody) => Promise<Invitation>;
  resendInvitation: (orgId: string, id: string) => Promise<Invitation>;
  revokeInvitation: (orgId: string, id: string) => Promise<void>;
  changeMemberRole: (orgId: string, userId: string, role: AssignableOrgRole) => Promise<OrgMember>;
  removeMember: (orgId: string, userId: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<Org>;
}

/** Evaluates organization member and invitation UI capabilities from the shared RBAC matrix. */
export function getMemberPermissions(role: OrgRole): MemberPermissions {
  return {
    invite: can(role, "member.invite"),
    changeRole: can(role, "member.changeRole"),
    remove: can(role, "member.remove"),
    leave: can(role, "member.leave"),
  };
}

/** Determines whether the caller may change role or remove a target member row. */
export function canEditTargetMember(
  actorRole: OrgRole,
  actorUserId: string,
  target: Pick<OrgMember, "userId" | "role">,
): { changeRole: boolean; remove: boolean } {
  if (target.role === "OWNER" || target.userId === actorUserId) {
    return { changeRole: false, remove: false };
  }
  return {
    changeRole: can(actorRole, "member.changeRole"),
    remove: can(actorRole, "member.remove"),
  };
}

/** Computes plan member quota usage combining live members and active pending invitations. */
export function getMemberQuotaSummary(
  planTier: PlanTier,
  memberCount: number,
  pendingCount: number,
): MemberQuotaSummary {
  const used = memberCount + pendingCount;
  const limit = PLAN_LIMITS[planTier].membersPerOrg;
  const remaining = limit === null ? null : Math.max(0, limit - used);
  const atLimit = !checkLimit(planTier, "membersPerOrg", used).allowed;
  const label = limit === null ? `${used} seats used (unlimited)` : `${used} / ${limit} seats used`;
  return { used, limit, remaining, atLimit, label };
}

/** Validates invitation dialog inputs against `CreateInvitationBodySchema`. */
export function validateInviteInput(email: string, role: string): ValidationResult<CreateInvitationBody> {
  const parsed = CreateInvitationBodySchema.safeParse({ email, role });
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, error: parsed.error.issues[0]?.message ?? "Check the invitation email and role." };
}

/** Validates member role updates against `AssignableOrgRoleSchema` (never grants OWNER). */
export function validateRoleChangeInput(role: string): ValidationResult<AssignableOrgRole> {
  const parsed = AssignableOrgRoleSchema.safeParse(role);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: "Choose a valid member role." };
}

/** Builds a relative `/invitations/accept` path preserving a trimmed token safely. */
export function buildInvitationAcceptPath(token: string): string {
  const trimmed = token.trim();
  return trimmed ? `/invitations/accept?token=${encodeURIComponent(trimmed)}` : "/invitations/accept";
}

const MEMBER_ERROR_COPY: Readonly<Record<string, string>> = {
  PLAN_LIMIT_REACHED: "You have reached your plan's member limit. Upgrade your plan or revoke a pending invite.",
  CONFLICT: "That person is already a member or already has a pending invitation.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "That member or invitation could not be found. Refresh and try again.",
  UNAUTHENTICATED: "Your session has expired. Sign in again to continue.",
  VALIDATION_ERROR: "Check the form fields and fix any invalid values.",
  RATE_LIMITED: "Too many requests. Wait a moment and try again.",
};

/** Maps member & invitation API errors into safe user-facing messages. */
export function formatMemberActionError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return MEMBER_ERROR_COPY[error.error.code] ?? fallback;
  if (error instanceof AuthApiError) return MEMBER_ERROR_COPY[error.code] ?? fallback;
  return fallback;
}

const ACCEPT_ERROR_COPY: Readonly<Record<string, string>> = {
  INVALID_TOKEN: "This invitation link is invalid or belongs to a removed workspace.",
  INVITATION_EXPIRED: "This invitation has expired. Ask an organization admin to send a new link.",
  INVITATION_REVOKED: "This invitation was revoked. Ask an organization admin for a new invitation.",
  EMAIL_NOT_VERIFIED: "Verify your email address before accepting this invitation.",
  FORBIDDEN: "This invitation was sent to a different email address than the account currently signed in.",
  CONFLICT: "This invitation has already been accepted or you are already a member.",
  RATE_LIMITED: "Too many invitation acceptance attempts. Please wait a little while and try again.",
  UNAUTHENTICATED: "Sign in or create an account to accept this invitation.",
};

/** Maps invitation acceptance errors to structured code + safe copy. */
export function formatInviteAcceptError(error: unknown): { code: string; message: string } {
  const code =
    error instanceof ApiClientError ? error.error.code : error instanceof AuthApiError ? error.code : "UNKNOWN_ERROR";
  return {
    code,
    message: ACCEPT_ERROR_COPY[code] ?? "We couldn't accept this invitation right now. Please try again.",
  };
}

/** Typed API client for organization members and invitations. */
export function createMembersClient(options?: ApiClientOptions): MembersClient {
  const req = createApiClient(options);
  return {
    listMembers: (orgId, signal) =>
      req({
        path: `/api/v1/orgs/${encodeURIComponent(orgId)}/members`,
        schema: z.array(OrgMemberSchema),
        ...(signal ? { signal } : {}),
      }),
    listInvitations: (orgId, signal) =>
      req({
        path: `/api/v1/orgs/${encodeURIComponent(orgId)}/invitations`,
        schema: z.array(InvitationSchema),
        ...(signal ? { signal } : {}),
      }),
    createInvitation: (orgId, body) =>
      req({
        path: `/api/v1/orgs/${encodeURIComponent(orgId)}/invitations`,
        method: "POST",
        body,
        schema: InvitationSchema,
      }),
    resendInvitation: (orgId, id) =>
      req({
        path: `/api/v1/orgs/${encodeURIComponent(orgId)}/invitations/${encodeURIComponent(id)}/resend`,
        method: "POST",
        schema: InvitationSchema,
      }),
    revokeInvitation: (orgId, id) =>
      req({
        path: `/api/v1/orgs/${encodeURIComponent(orgId)}/invitations/${encodeURIComponent(id)}`,
        method: "DELETE",
        schema: z.undefined(),
      }),
    changeMemberRole: (orgId, userId, role) =>
      req({
        path: `/api/v1/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`,
        method: "PATCH",
        body: { role },
        schema: OrgMemberSchema,
      }),
    removeMember: (orgId, userId) =>
      req({
        path: `/api/v1/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`,
        method: "DELETE",
        schema: z.undefined(),
      }),
    acceptInvitation: (token) =>
      req({ path: "/api/v1/invitations/accept", method: "POST", body: { token }, schema: OrgSchema }),
  };
}

export const membersClient = createMembersClient();
