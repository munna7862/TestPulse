import { type ApiError, type Invitation, type OrgMember } from "@testpulse/shared";
import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";
import { ApiError as AuthApiError } from "./auth-client";
import {
  canEditTargetMember,
  createMembersClient,
  formatMemberActionError,
  getMemberPermissions,
  getMemberQuotaSummary,
  INVITE_ROLE_OPTIONS,
  validateInviteInput,
  validateRoleChangeInput,
} from "./members";

const makeMember = (overrides: Partial<OrgMember> = {}): OrgMember => ({
  userId: "01950000-0000-7000-8000-000000000010",
  name: "Dana Member",
  email: "dana@example.com",
  role: "MEMBER",
  joinedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const makeInvite = (overrides: Partial<Invitation> = {}): Invitation => ({
  id: "01950000-0000-7000-8000-000000000020",
  orgId: "01950000-0000-7000-8000-000000000001",
  email: "invitee@example.com",
  role: "MEMBER",
  invitedById: "01950000-0000-7000-8000-000000000009",
  invitedByName: "Alice Admin",
  expiresAt: "2026-12-05T00:00:00.000Z",
  createdAt: "2026-11-28T00:00:00.000Z",
  ...overrides,
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("[SC-ORG-016] [SC-ORG-014] [SC-ORG-015] member RBAC gating helpers", () => {
  it("evaluates permissions directly from the shared RBAC map without granting OWNER", () => {
    expect(INVITE_ROLE_OPTIONS).toEqual(["ADMIN", "MEMBER", "VIEWER"]);
    expect(getMemberPermissions("OWNER")).toEqual({ invite: true, changeRole: true, remove: true, leave: false });
    expect(getMemberPermissions("ADMIN")).toEqual({ invite: true, changeRole: true, remove: true, leave: true });
    expect(getMemberPermissions("MEMBER")).toEqual({ invite: false, changeRole: false, remove: false, leave: true });
    expect(getMemberPermissions("VIEWER")).toEqual({ invite: false, changeRole: false, remove: false, leave: true });
  });

  it("blocks editing or removing the Owner or the signed-in caller themself", () => {
    const ownerTarget = makeMember({ userId: "u-owner", role: "OWNER" });
    const otherMember = makeMember({ userId: "u-member", role: "MEMBER" });

    expect(canEditTargetMember("OWNER", "u-owner", ownerTarget)).toEqual({ changeRole: false, remove: false });
    expect(canEditTargetMember("ADMIN", "u-admin", ownerTarget)).toEqual({ changeRole: false, remove: false });
    expect(canEditTargetMember("ADMIN", "u-admin", makeMember({ userId: "u-admin", role: "ADMIN" }))).toEqual({
      changeRole: false,
      remove: false,
    });
    expect(canEditTargetMember("ADMIN", "u-admin", otherMember)).toEqual({ changeRole: true, remove: true });
    expect(canEditTargetMember("MEMBER", "u-self", otherMember)).toEqual({ changeRole: false, remove: false });
  });
});

describe("[SC-PLAN-002] [SC-ORG-010] member quota, invite validation and role validation", () => {
  it("computes Free, Pro and Enterprise seat usage including pending invitations", () => {
    expect(getMemberQuotaSummary("FREE", 2, 1)).toEqual({
      used: 3,
      limit: 3,
      remaining: 0,
      atLimit: true,
      label: "3 / 3 seats used",
    });
    expect(getMemberQuotaSummary("PRO", 4, 2)).toEqual({
      used: 6,
      limit: 25,
      remaining: 19,
      atLimit: false,
      label: "6 / 25 seats used",
    });
    expect(getMemberQuotaSummary("ENTERPRISE", 12, 3)).toEqual({
      used: 15,
      limit: null,
      remaining: null,
      atLimit: false,
      label: "15 seats used (unlimited)",
    });
  });

  it("validates invite payloads against CreateInvitationBodySchema and blocks OWNER", () => {
    expect(validateInviteInput("  New.User@Example.COM ", "MEMBER")).toEqual({
      ok: true,
      data: { email: "new.user@example.com", role: "MEMBER" },
    });
    expect(validateInviteInput("not-an-email", "MEMBER").ok).toBe(false);
    expect(validateInviteInput("user@example.com", "OWNER").ok).toBe(false);
    expect(validateRoleChangeInput("ADMIN")).toEqual({ ok: true, data: "ADMIN" });
    expect(validateRoleChangeInput("OWNER").ok).toBe(false);
  });
});

describe("[SC-ORG-010] [SC-ORG-014] [SC-ORG-015] error mapping and typed members API client", () => {
  it("maps member and invitation API error codes into safe user-facing messages", () => {
    const mkErr = (status: number, code: ApiError["code"], message = "raw backend msg") =>
      new ApiClientError(status, { code, message });

    expect(formatMemberActionError(mkErr(403, "PLAN_LIMIT_REACHED"), "fallback")).toContain("limit");
    expect(formatMemberActionError(mkErr(409, "CONFLICT"), "fallback")).toContain("already");
    expect(formatMemberActionError(mkErr(403, "FORBIDDEN"), "fallback")).toContain("permission");
    expect(formatMemberActionError(new AuthApiError("UNAUTHENTICATED", "No session", 401), "fallback")).toContain(
      "expired",
    );
    expect(formatMemberActionError(new Error("boom"), "Safe fallback")).toBe("Safe fallback");
  });

  it("parses members, invitations, role updates and removals with Zod", async () => {
    const orgId = "01950000-0000-7000-8000-000000000001";
    const member = makeMember();
    const invite = makeInvite();

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [member] }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [invite] }))
      .mockResolvedValueOnce(jsonResponse(201, { success: true, data: invite }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: invite }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ...member, role: "VIEWER" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = createMembersClient({ fetch: fetchMock });
    expect(await client.listMembers(orgId)).toEqual([member]);
    expect(await client.listInvitations(orgId)).toEqual([invite]);
    expect(await client.createInvitation(orgId, { email: "invitee@example.com", role: "MEMBER" })).toEqual(invite);
    expect(await client.resendInvitation(orgId, invite.id)).toEqual(invite);
    await expect(client.revokeInvitation(orgId, invite.id)).resolves.toBeUndefined();
    expect(await client.changeMemberRole(orgId, member.userId, "VIEWER")).toMatchObject({ role: "VIEWER" });
    await expect(client.removeMember(orgId, member.userId)).resolves.toBeUndefined();
  });
});
