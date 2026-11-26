import { type ApiError, type Org, sanitizeReturnTo } from "@testpulse/shared";
import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";
import { ApiError as AuthApiError } from "./auth-client";
import { buildInvitationAcceptPath, createMembersClient, formatInviteAcceptError } from "./members";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const joinedOrg: Org = {
  id: "01950000-0000-7000-8000-000000000001",
  name: "Acme QA",
  slug: "acme-qa",
  planTier: "FREE",
  role: "VIEWER",
  createdAt: "2026-10-01T00:00:00.000Z",
};

describe("[SC-AUTH-021] invitation accept returnTo path builder and sanitizer", () => {
  it("preserves safe relative /invitations/accept returnTo paths and rejects hostile URLs", () => {
    const acceptPath = buildInvitationAcceptPath("  tok_abc+123=  ");
    expect(acceptPath).toBe("/invitations/accept?token=tok_abc%2B123%3D");
    expect(sanitizeReturnTo(acceptPath)).toBe(acceptPath);
    expect(sanitizeReturnTo("//evil.example/invitations/accept?token=abc")).toBe("/runs");
    expect(sanitizeReturnTo("https://evil.example/invitations/accept?token=abc")).toBe("/runs");
    expect(sanitizeReturnTo("/invitations/other")).toBe("/runs");
    expect(buildInvitationAcceptPath("   ")).toBe("/invitations/accept");
  });
});

describe("[SC-ORG-011] [SC-ORG-012] [SC-ORG-013] invitation accept error mapping and typed client", () => {
  it("maps every accept error code into safe user-facing copy without leaking internal details", () => {
    const mkErr = (status: number, code: ApiError["code"], msg = "internal stack trace") =>
      new ApiClientError(status, { code, message: msg });

    expect(formatInviteAcceptError(mkErr(400, "INVALID_TOKEN"))).toMatchObject({ code: "INVALID_TOKEN" });
    expect(formatInviteAcceptError(mkErr(400, "INVITATION_EXPIRED"))).toMatchObject({ code: "INVITATION_EXPIRED" });
    expect(formatInviteAcceptError(mkErr(400, "INVITATION_REVOKED"))).toMatchObject({ code: "INVITATION_REVOKED" });
    expect(formatInviteAcceptError(mkErr(403, "EMAIL_NOT_VERIFIED"))).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    expect(formatInviteAcceptError(mkErr(403, "FORBIDDEN"))).toMatchObject({ code: "FORBIDDEN" });
    expect(formatInviteAcceptError(mkErr(409, "CONFLICT"))).toMatchObject({ code: "CONFLICT" });
    expect(formatInviteAcceptError(mkErr(429, "RATE_LIMITED"))).toMatchObject({ code: "RATE_LIMITED" });
    expect(formatInviteAcceptError(new AuthApiError("UNAUTHENTICATED", "No session", 401))).toMatchObject({
      code: "UNAUTHENTICATED",
    });
    const unknown = formatInviteAcceptError(new Error("raw failure"));
    expect(unknown.code).toBe("UNKNOWN_ERROR");
    expect(unknown.message).not.toContain("raw failure");
  });

  it("posts raw token to /api/v1/invitations/accept with credentials and parses OrgSchema", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: joinedOrg }));
    const client = createMembersClient({ fetch: fetchMock });

    expect(await client.acceptInvitation("raw-invitation-token-123456")).toEqual(joinedOrg);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/invitations/accept");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ token: "raw-invitation-token-123456" }),
    });
  });
});
