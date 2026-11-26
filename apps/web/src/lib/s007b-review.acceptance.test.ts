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
  });
});
