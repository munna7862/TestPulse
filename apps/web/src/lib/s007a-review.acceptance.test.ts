import { type ApiError, type Invitation, type OrgMember } from "@testpulse/shared";
import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";
import { ApiError as AuthApiError } from "./auth-client";
import { createMembersClient, formatMemberActionError, getMemberQuotaSummary } from "./members";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const member: OrgMember = {
  userId: "01950000-0000-7000-8000-000000000010",
  name: "Dana Member",
  email: "dana@example.com",
  role: "MEMBER",
  joinedAt: "2026-10-01T00:00:00.000Z",
};

const invite: Invitation = {
  id: "01950000-0000-7000-8000-000000000020",
  orgId: "01950000-0000-7000-8000-000000000001",
  email: "invitee@example.com",
  role: "ADMIN",
  invitedById: "01950000-0000-7000-8000-000000000009",
  invitedByName: "Alice Admin",
  expiresAt: "2026-12-05T00:00:00.000Z",
  createdAt: "2026-11-28T00:00:00.000Z",
};

describe("S-007a review: members helpers and client request verification", () => {
  it("[SC-PLAN-002] clamps remaining seats to zero when used exceeds plan limit", () => {
    expect(getMemberQuotaSummary("FREE", 3, 1)).toEqual({
      used: 4,
      limit: 3,
      remaining: 0,
      atLimit: true,
      label: "4 / 3 seats used",
    });
  });

  it("[SC-ORG-010] [SC-ORG-014] [SC-ORG-015] maps remaining API/Auth error codes and unmapped fallbacks safely", () => {
    const mkErr = (status: number, code: ApiError["code"], msg = "internal trace") =>
      new ApiClientError(status, { code, message: msg });

    expect(formatMemberActionError(mkErr(404, "NOT_FOUND"), "fallback")).toContain("could not be found");
    expect(formatMemberActionError(mkErr(400, "VALIDATION_ERROR"), "fallback")).toContain("Check the form");
    expect(formatMemberActionError(mkErr(429, "RATE_LIMITED"), "fallback")).toContain("Too many requests");
    expect(formatMemberActionError(mkErr(500, "INTERNAL", "secret sql stack"), "Safe api fallback")).toBe(
      "Safe api fallback",
    );
    expect(formatMemberActionError(new AuthApiError("UNKNOWN", "raw auth leak", 500), "Safe auth fallback")).toBe(
      "Safe auth fallback",
    );
  });

  it("[SC-ORG-010] [SC-ORG-014] [SC-ORG-015] forwards AbortSignal, HTTP methods, paths, and JSON bodies on membersClient", async () => {
    const orgId = "01950000-0000-7000-8000-000000000001";
    const ac = new AbortController();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [member] }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [invite] }))
      .mockResolvedValueOnce(jsonResponse(201, { success: true, data: invite }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: invite }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ...member, role: "ADMIN" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = createMembersClient({ fetch: fetchMock });
    await client.listMembers(orgId, ac.signal);
    await client.listInvitations(orgId, ac.signal);
    await client.createInvitation(orgId, { email: "invitee@example.com", role: "ADMIN" });
    await client.resendInvitation(orgId, invite.id);
    await client.revokeInvitation(orgId, invite.id);
    await client.changeMemberRole(orgId, member.userId, "ADMIN");
    await client.removeMember(orgId, member.userId);

    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/v1/orgs/${orgId}/members`);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "GET", signal: ac.signal, credentials: "include" });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`/api/v1/orgs/${orgId}/invitations`);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "GET", signal: ac.signal });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ email: "invitee@example.com", role: "ADMIN" }),
    });
    expect(fetchMock.mock.calls[3]?.[0]).toBe(`/api/v1/orgs/${orgId}/invitations/${invite.id}/resend`);
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[4]?.[0]).toBe(`/api/v1/orgs/${orgId}/invitations/${invite.id}`);
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[5]?.[0]).toBe(`/api/v1/orgs/${orgId}/members/${member.userId}`);
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({ method: "PATCH", body: JSON.stringify({ role: "ADMIN" }) });
    expect(fetchMock.mock.calls[6]?.[0]).toBe(`/api/v1/orgs/${orgId}/members/${member.userId}`);
    expect(fetchMock.mock.calls[6]?.[1]).toMatchObject({ method: "DELETE" });
  });
});
