import crypto from "node:crypto";
import type { PrismaClient, User } from "@testpulse/db";
import { VerificationTokenType } from "@testpulse/db";
import type { ApiEnv } from "../../env";
import type { Mailer } from "../../lib/mailer";
import { hashPassword, verifyPassword } from "./password";
import { generateRandomToken, hashRefreshToken, hashVerificationToken } from "./tokens";

export interface AuthDependencies {
  db: PrismaClient;
  mailer: Mailer;
  jwtSign: (payload: { sub: string; sid: string }) => string;
  env: ApiEnv;
}

export class AuthError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthService {
  constructor(private readonly deps: AuthDependencies) {}

  public get db(): PrismaClient {
    return this.deps.db;
  }

  /**
   * Register a new user with argon2id hashed password and send verification email.
   * Uses generic response to avoid account enumeration (SC-AUTH-001, SC-AUTH-002).
   */
  async register(params: { email: string; password: string; name: string }): Promise<{ message: string }> {
    const email = params.email.toLowerCase().trim();
    const existing = await this.deps.db.user.findUnique({ where: { email } });

    if (existing) {
      // Do not disclose account presence; return generic 202 message
      return {
        message: "If your email is not already registered, you will receive a verification link.",
      };
    }

    const passwordHash = await hashPassword(params.password);
    const token = generateRandomToken(32);
    const tokenHash = hashVerificationToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.deps.db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name: params.name.trim(),
          passwordHash,
        },
      });

      await tx.verificationToken.create({
        data: {
          userId: newUser.id,
          type: VerificationTokenType.EMAIL_VERIFY,
          tokenHash,
          expiresAt,
        },
      });

      return newUser;
    });

    const verifyUrl = `${this.deps.env.APP_URL}/verify-email?token=${token}`;
    await this.deps.mailer.sendVerificationEmail({
      to: user.email,
      name: user.name,
      token,
      verifyUrl,
    });

    return {
      message: "If your email is not already registered, you will receive a verification link.",
    };
  }

  /**
   * Verify email using a single-use token (SC-AUTH-004, SC-AUTH-005).
   */
  async verifyEmail(token: string): Promise<{ verified: boolean; message: string }> {
    const tokenHash = hashVerificationToken(token);

    const verificationToken = await this.deps.db.verificationToken.findFirst({
      where: {
        tokenHash,
        type: VerificationTokenType.EMAIL_VERIFY,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      throw new AuthError(400, "INVALID_TOKEN", "Verification token is invalid or has expired.");
    }

    await this.deps.db.$transaction(async (tx) => {
      await tx.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerifiedAt: new Date() },
      });
    });

    return {
      verified: true,
      message: "Email has been successfully verified.",
    };
  }

  /**
   * Resend verification email (generic response).
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.deps.db.user.findUnique({ where: { email: normalizedEmail } });

    if (user && !user.emailVerifiedAt && !user.deletedAt) {
      const token = generateRandomToken(32);
      const tokenHash = hashVerificationToken(token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await this.deps.db.$transaction(async (tx) => {
        // Invalidate old unexpired tokens
        await tx.verificationToken.updateMany({
          where: {
            userId: user.id,
            type: VerificationTokenType.EMAIL_VERIFY,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        });

        await tx.verificationToken.create({
          data: {
            userId: user.id,
            type: VerificationTokenType.EMAIL_VERIFY,
            tokenHash,
            expiresAt,
          },
        });
      });

      const verifyUrl = `${this.deps.env.APP_URL}/verify-email?token=${token}`;
      await this.deps.mailer.sendVerificationEmail({
        to: user.email,
        name: user.name,
        token,
        verifyUrl,
      });
    }

    return {
      message: "If an unverified account with this email exists, a verification link has been sent.",
    };
  }

  /**
   * Login user, create session family, and return access token and refresh token (SC-AUTH-006, SC-AUTH-007).
   */
  async login(params: {
    email: string;
    password: string;
    userAgent?: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const email = params.email.toLowerCase().trim();
    const user = await this.deps.db.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash || user.deletedAt) {
      throw new AuthError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const passwordMatches = await verifyPassword(user.passwordHash, params.password);
    if (!passwordMatches) {
      throw new AuthError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const familyId = crypto.randomUUID();
    const refreshToken = generateRandomToken(32);
    const refreshTokenHash = hashRefreshToken(refreshToken, this.deps.env.JWT_REFRESH_SECRET);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session = await this.deps.db.session.create({
      data: {
        userId: user.id,
        familyId,
        refreshTokenHash,
        expiresAt,
        userAgent: params.userAgent,
      },
    });

    const accessToken = this.deps.jwtSign({
      sub: user.id,
      sid: session.id,
    });

    return { user, accessToken, refreshToken };
  }

  /**
   * Refresh session tokens with rotation and token-reuse detection (SC-AUTH-008, SC-AUTH-009).
   */
  async refreshSession(params: {
    refreshToken: string;
    userAgent?: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const tokenHash = hashRefreshToken(params.refreshToken, this.deps.env.JWT_REFRESH_SECRET);

    const session = await this.deps.db.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new AuthError(401, "INVALID_SESSION", "Invalid session or refresh token.");
    }

    // Reuse detection: If the session was already revoked or replaced, revoke entire family!
    if (session.revokedAt !== null || session.replacedById !== null) {
      await this.deps.db.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AuthError(
        401,
        "TOKEN_REUSE_DETECTED",
        "Token reuse detected. All sessions in this family have been terminated.",
      );
    }

    // Check expiration
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.deps.db.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new AuthError(401, "SESSION_EXPIRED", "Session has expired. Please log in again.");
    }

    // Rotate refresh token
    const newRefreshToken = generateRandomToken(32);
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken, this.deps.env.JWT_REFRESH_SECRET);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newSession = await this.deps.db.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: session.userId,
          familyId: session.familyId,
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
          userAgent: params.userAgent ?? session.userAgent,
        },
      });

      await tx.session.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedById: created.id,
        },
      });

      return created;
    });

    const accessToken = this.deps.jwtSign({
      sub: session.userId,
      sid: newSession.id,
    });

    return {
      user: session.user,
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke a single session (SC-AUTH-010).
   */
  async logout(sessionId: string): Promise<void> {
    await this.deps.db.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke all sessions for a user (SC-AUTH-010).
   */
  async logoutAll(userId: string): Promise<void> {
    await this.deps.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Request password reset token (SC-AUTH-011).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.deps.db.user.findUnique({ where: { email: normalizedEmail } });

    if (user && !user.deletedAt) {
      const token = generateRandomToken(32);
      const tokenHash = hashVerificationToken(token);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes per ADR-005

      await this.deps.db.$transaction(async (tx) => {
        // Invalidate old unexpired reset tokens for this user
        await tx.verificationToken.updateMany({
          where: {
            userId: user.id,
            type: VerificationTokenType.PASSWORD_RESET,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        });

        await tx.verificationToken.create({
          data: {
            userId: user.id,
            type: VerificationTokenType.PASSWORD_RESET,
            tokenHash,
            expiresAt,
          },
        });
      });

      const resetUrl = `${this.deps.env.APP_URL}/reset-password?token=${token}`;
      await this.deps.mailer.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token,
        resetUrl,
      });
    }

    return {
      message: "If an account with that email exists, password reset instructions have been sent.",
    };
  }

  /**
   * Confirm password reset using single-use token, and invalidate all active sessions (SC-AUTH-012).
   */
  async resetPassword(params: { token: string; newPassword: string }): Promise<{ message: string }> {
    const tokenHash = hashVerificationToken(params.token);

    const verificationToken = await this.deps.db.verificationToken.findFirst({
      where: {
        tokenHash,
        type: VerificationTokenType.PASSWORD_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      throw new AuthError(400, "INVALID_TOKEN", "Password reset token is invalid or has expired.");
    }

    const newPasswordHash = await hashPassword(params.newPassword);

    await this.deps.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verificationToken.userId },
        data: { passwordHash: newPasswordHash },
      });

      await tx.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      });

      // Revoke all existing sessions for this user (ADR-005)
      await tx.session.updateMany({
        where: { userId: verificationToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return {
      message: "Your password has been successfully reset. You may now log in with your new password.",
    };
  }

  /**
   * Get user by ID.
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.deps.db.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
  }
}
