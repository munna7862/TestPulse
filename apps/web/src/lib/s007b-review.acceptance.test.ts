import { type ApiError } from "@testpulse/shared";
import { describe, expect, it } from "vitest";
import { ApiClientError } from "./api-client";
import { ApiError as AuthApiError } from "./auth-client";
import { formatInviteAcceptError } from "./members";

describe("S-007b review: formatInviteAcceptError fallback branches", () => {
  it("[SC-ORG-013] maps unmapped ApiClientError/AuthApiError codes and non-Error throws to safe fallback copy", () => {
    const mkErr = (status: number, code: ApiError["code"], msg: string) =>
      new ApiClientError(status, { code, message: msg });

    const apiFallback = formatInviteAcceptError(mkErr(500, "INTERNAL", "secret pg stack"));
    expect(apiFallback).toEqual({
      code: "INTERNAL",
      message: "We couldn't accept this invitation right now. Please try again.",
    });

    const authFallback = formatInviteAcceptError(new AuthApiError("INTERNAL", "raw auth leak", 500));
    expect(authFallback).toEqual({
      code: "INTERNAL",
      message: "We couldn't accept this invitation right now. Please try again.",
    });

    for (const weird of ["string-err", null, { nested: 1 }]) {
      const res = formatInviteAcceptError(weird);
      expect(res).toEqual({
        code: "UNKNOWN_ERROR",
        message: "We couldn't accept this invitation right now. Please try again.",
      });
    }

    const mappedCases: Array<[number, ApiError["code"], string]> = [
      [400, "INVALID_TOKEN", "This invitation link is invalid or belongs to a removed workspace."],
      [400, "INVITATION_EXPIRED", "This invitation has expired. Ask an organization admin to send a new link."],
      [400, "INVITATION_REVOKED", "This invitation was revoked. Ask an organization admin for a new invitation."],
      [403, "EMAIL_NOT_VERIFIED", "Verify your email address before accepting this invitation."],
      [403, "FORBIDDEN", "This invitation was sent to a different email address than the account currently signed in."],
      [409, "CONFLICT", "This invitation has already been accepted or you are already a member."],
      [429, "RATE_LIMITED", "Too many invitation acceptance attempts. Please wait a little while and try again."],
      [401, "UNAUTHENTICATED", "Sign in or create an account to accept this invitation."],
    ];
    for (const [status, code, expectedMessage] of mappedCases) {
      const formatted = formatInviteAcceptError(mkErr(status, code, "internal stack trace leak"));
      expect(formatted).toEqual({ code, message: expectedMessage });
      expect(formatted.message).not.toContain("internal stack trace leak");
    }
  });
});
