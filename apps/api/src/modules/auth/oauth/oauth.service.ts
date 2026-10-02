import type { PrismaClient, User } from "@testpulse/db";
import { OAuthProvider as DbOAuthProvider } from "@testpulse/db";
import type { ListOAuthAccountsResponse, OAuthErrorCode, OAuthProvider } from "@testpulse/shared";
import { AuthError } from "../auth.service";
import type { ProviderProfile } from "./providers";

/** A refusal in the sign-in/link flow; the route turns it into a redirect to the friendly error page. */
export class OAuthFlowError extends Error {
  constructor(public readonly code: OAuthErrorCode) {
    super(code);
    this.name = "OAuthFlowError";
  }
}

const DB_PROVIDER: Record<OAuthProvider, DbOAuthProvider> = {
  google: DbOAuthProvider.GOOGLE,
  github: DbOAuthProvider.GITHUB,
};

const WEB_PROVIDER: Record<DbOAuthProvider, OAuthProvider> = {
  [DbOAuthProvider.GOOGLE]: "google",
  [DbOAuthProvider.GITHUB]: "github",
};

const MAX_NAME_LENGTH = 100;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function displayName(profile: ProviderProfile, email: string): string {
  const candidate = profile.name?.trim() || email.split("@")[0] || "TestPulse user";
  return candidate.slice(0, MAX_NAME_LENGTH);
}

/**
 * Account resolution for OAuth sign-in and linking (ADR-005 §8). `OAuthAccount` is a global identity
 * table, so this service uses the system client; it never touches tenant-owned tables.
 */
export class OAuthService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Resolves a provider profile to a user, creating or linking as the rules allow:
   * 1. An already-linked provider account signs in.
   * 2. Otherwise a provider-verified email is required (an unverified email is never trusted).
   * 3. An existing local account is linked only when its own email is verified too; otherwise refuse.
   * 4. With no existing account, create a verified user.
   */
  async resolveSignIn(provider: OAuthProvider, profile: ProviderProfile): Promise<User> {
    try {
      return await this.resolveOnce(provider, profile);
    } catch (error) {
      // Two concurrent first-time callbacks race on the unique constraints; the loser re-resolves and
      // then finds the winner's rows.
      if (isUniqueViolation(error)) return this.resolveOnce(provider, profile);
      throw error;
    }
  }

  private async resolveOnce(provider: OAuthProvider, profile: ProviderProfile): Promise<User> {
    const dbProvider = DB_PROVIDER[provider];

    const linked = await this.db.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: dbProvider, providerAccountId: profile.providerAccountId } },
      include: { user: true },
    });
    if (linked) {
      if (linked.user.deletedAt) throw new OAuthFlowError("ACCOUNT_DISABLED");
      return linked.user;
    }

    if (!profile.email || !profile.emailVerified) throw new OAuthFlowError("EMAIL_UNVERIFIED");
    const email = profile.email;

    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.deletedAt) throw new OAuthFlowError("ACCOUNT_DISABLED");
      // Pre-hijacking guard: an unverified local account may belong to an attacker who registered the
      // victim's address, so it is never auto-linked.
      if (!existing.emailVerifiedAt) throw new OAuthFlowError("EMAIL_CONFLICT");
      await this.db.oAuthAccount.create({
        data: { userId: existing.id, provider: dbProvider, providerAccountId: profile.providerAccountId },
      });
      return existing;
    }

    return this.db.user.create({
      data: {
        email,
        name: displayName(profile, email),
        avatarUrl: profile.avatarUrl,
        emailVerifiedAt: new Date(),
        oauthAccounts: { create: { provider: dbProvider, providerAccountId: profile.providerAccountId } },
      },
    });
  }

  /**
   * Attaches a provider account to a user who explicitly asked for it from settings. The provider email
   * need not match: the signed-in, email-verified user is proving control of the provider account.
   */
  async linkToUser(userId: string, provider: OAuthProvider, profile: ProviderProfile): Promise<void> {
    const dbProvider = DB_PROVIDER[provider];

    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new OAuthFlowError("ACCOUNT_DISABLED");

    const existing = await this.db.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: dbProvider, providerAccountId: profile.providerAccountId } },
    });
    if (existing) {
      if (existing.userId === userId) return; // idempotent
      throw new OAuthFlowError("ACCOUNT_ALREADY_LINKED");
    }

    const sameProvider = await this.db.oAuthAccount.findFirst({ where: { userId, provider: dbProvider } });
    if (sameProvider) throw new OAuthFlowError("ACCOUNT_ALREADY_LINKED");

    try {
      await this.db.oAuthAccount.create({
        data: { userId, provider: dbProvider, providerAccountId: profile.providerAccountId },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new OAuthFlowError("ACCOUNT_ALREADY_LINKED");
      throw error;
    }
  }

  /** True when the session is live and belongs to `userId` (used to bind a link flow to its initiator). */
  async isActiveSessionFor(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.db.session.findUnique({ where: { id: sessionId } });
    return (
      session !== null &&
      session.userId === userId &&
      session.revokedAt === null &&
      session.expiresAt.getTime() > Date.now()
    );
  }

  async listAccounts(user: User): Promise<ListOAuthAccountsResponse> {
    const rows = await this.db.oAuthAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return {
      accounts: rows.map((row) => ({
        id: row.id,
        provider: WEB_PROVIDER[row.provider],
        createdAt: row.createdAt.toISOString(),
      })),
      hasPassword: user.passwordHash !== null,
    };
  }

  /** Removes a linked account, refusing to remove the user's last way to sign in. */
  async unlink(user: User, accountId: string): Promise<void> {
    await this.db.$transaction(
      async (tx) => {
        // Ownership is part of the lookup: another user's account id is indistinguishable from a missing one.
        const account = await tx.oAuthAccount.findFirst({ where: { id: accountId, userId: user.id } });
        if (!account) throw new AuthError(404, "NOT_FOUND", "Linked account not found.");

        const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
        const otherAccounts = await tx.oAuthAccount.count({ where: { userId: user.id, id: { not: account.id } } });
        const remainingMethods = otherAccounts + (fresh?.passwordHash ? 1 : 0);
        if (remainingMethods === 0) {
          throw new AuthError(
            409,
            "CONFLICT",
            "You cannot remove your only way to sign in. Set a password or link another account first.",
          );
        }

        await tx.oAuthAccount.delete({ where: { id: account.id } });
      },
      { isolationLevel: "Serializable" },
    );
  }
}
