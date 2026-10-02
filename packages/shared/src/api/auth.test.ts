import { describe, expect, it } from "vitest";
import {
  ForgotPasswordBodySchema,
  LoginBodySchema,
  RegisterBodySchema,
  ResetPasswordBodySchema,
  VerifyEmailBodySchema,
} from "./auth";

describe("Auth Zod Schemas", () => {
  it("[SC-AUTH-003] rejects passwords shorter than 10 characters", () => {
    const result = RegisterBodySchema.safeParse({
      email: "user@example.com",
      password: "short",
      name: "Alice",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("10 characters");
    }
  });

  it("[SC-AUTH-003] rejects malformed emails", () => {
    const result = RegisterBodySchema.safeParse({
      email: "invalid-email",
      password: "ValidPassword123!",
      name: "Alice",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes email to lower case", () => {
    const result = RegisterBodySchema.parse({
      email: "  User@EXAMPLE.com  ",
      password: "ValidPassword123!",
      name: "  Alice  ",
    });
    expect(result.email).toBe("user@example.com");
    expect(result.name).toBe("Alice");
  });

  it("validates login body", () => {
    const valid = LoginBodySchema.safeParse({
      email: "test@example.com",
      password: "secretpassword",
    });
    expect(valid.success).toBe(true);

    const emptyPass = LoginBodySchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(emptyPass.success).toBe(false);
  });

  it("validates token format in verify email", () => {
    const valid = VerifyEmailBodySchema.safeParse({
      token: "dummy-mock-token-sample-string-at-least-32-chars",
    });
    expect(valid.success).toBe(true);

    const invalid = VerifyEmailBodySchema.safeParse({
      token: "too-short",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates reset password requirements", () => {
    const valid = ResetPasswordBodySchema.safeParse({
      token: "dummy-mock-token-sample-string-at-least-32-chars",
      newPassword: "BrandNewSecurePassword123",
    });
    expect(valid.success).toBe(true);

    const tooShort = ResetPasswordBodySchema.safeParse({
      token: "dummy-mock-token-sample-string-at-least-32-chars",
      newPassword: "short",
    });
    expect(tooShort.success).toBe(false);
  });

  it("validates forgot password", () => {
    const valid = ForgotPasswordBodySchema.safeParse({
      email: "USER@EXAMPLE.COM",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.email).toBe("user@example.com");
    }
  });
});
