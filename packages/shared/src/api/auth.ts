import { z } from "zod";

/**
 * Password rules per ADR-005:
 * Minimum length 10, maximum length 256 (to bound argon2id hashing cost).
 */
export const PasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(256, "Password must not exceed 256 characters");

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address")
  .max(255, "Email address is too long");

export const NameSchema = z.string().trim().min(1, "Name is required").max(100, "Name must not exceed 100 characters");

export const TokenStringSchema = z
  .string()
  .trim()
  .min(16, "Token is invalid or malformed")
  .max(256, "Token is invalid");

// --- Register ---
export const RegisterBodySchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: NameSchema,
});
export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const RegisterResponseSchema = z.object({
  message: z.string(),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

// --- Verify Email ---
export const VerifyEmailBodySchema = z.object({
  token: TokenStringSchema,
});
export type VerifyEmailBody = z.infer<typeof VerifyEmailBodySchema>;

export const VerifyEmailResponseSchema = z.object({
  verified: z.boolean(),
  message: z.string(),
});
export type VerifyEmailResponse = z.infer<typeof VerifyEmailResponseSchema>;

// --- Resend Verification ---
export const ResendVerificationBodySchema = z.object({
  email: EmailSchema,
});
export type ResendVerificationBody = z.infer<typeof ResendVerificationBodySchema>;

export const ResendVerificationResponseSchema = z.object({
  message: z.string(),
});
export type ResendVerificationResponse = z.infer<typeof ResendVerificationResponseSchema>;

// --- User Entity in Auth Context ---
export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().nullable().optional(),
  emailVerifiedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

// --- Login ---
export const LoginBodySchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required").max(256),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// --- Refresh ---
export const RefreshResponseSchema = z.object({
  refreshed: z.boolean(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

// --- Logout ---
export const LogoutResponseSchema = z.object({
  loggedOut: z.boolean(),
});
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

// --- Forgot Password ---
export const ForgotPasswordBodySchema = z.object({
  email: EmailSchema,
});
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBodySchema>;

export const ForgotPasswordResponseSchema = z.object({
  message: z.string(),
});
export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;

// --- Reset Password ---
export const ResetPasswordBodySchema = z.object({
  token: TokenStringSchema,
  newPassword: PasswordSchema,
});
export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>;

export const ResetPasswordResponseSchema = z.object({
  message: z.string(),
});
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;

// --- Me ---
export const AuthMeResponseSchema = z.object({
  user: AuthUserSchema,
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
