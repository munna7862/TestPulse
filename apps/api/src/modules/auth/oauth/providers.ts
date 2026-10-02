import { GitHubEmailsSchema, GitHubUserSchema, GoogleUserInfoSchema, type OAuthProvider } from "@testpulse/shared";
import {
  ArcticFetchError,
  CodeChallengeMethod,
  OAuth2Client,
  OAuth2RequestError,
  UnexpectedErrorResponseBodyError,
  UnexpectedResponseError,
} from "arctic";
import type { ApiEnv } from "../../../env";

/** Provider-agnostic identity returned by a successful code exchange. */
export interface ProviderProfile {
  providerAccountId: string;
  /** Lower-cased email, or `null` when the provider supplied none that we may trust. */
  email: string | null;
  /** True only when the provider itself asserts that `email` is verified. */
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
}

/** Raised when the provider rejects the exchange or returns something unusable. */
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

interface ProviderDefinition {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  fetchProfile: (accessToken: string, timeoutMs: number) => Promise<ProviderProfile>;
}

async function getJson(
  url: string,
  accessToken: string,
  timeoutMs: number,
  extraHeaders: Record<string, string> = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...extraHeaders },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ProviderError("Provider profile request failed.");
  }
  if (!response.ok) throw new ProviderError(`Provider profile request returned ${response.status}.`);
  try {
    return await response.json();
  } catch {
    throw new ProviderError("Provider profile response was not valid JSON.");
  }
}

/** Rejects with `ProviderError` when `promise` has not settled within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new ProviderError("Provider request timed out.")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function normalizeEmail(email: string | undefined): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

const google: ProviderDefinition = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  scopes: ["openid", "email", "profile"],
  async fetchProfile(accessToken, timeoutMs) {
    const json = await getJson("https://openidconnect.googleapis.com/v1/userinfo", accessToken, timeoutMs);
    const parsed = GoogleUserInfoSchema.safeParse(json);
    if (!parsed.success) throw new ProviderError("Google profile response had an unexpected shape.");
    const info = parsed.data;
    const email = normalizeEmail(info.email);
    return {
      providerAccountId: info.sub,
      email,
      emailVerified: email !== null && info.email_verified === true,
      name: info.name?.trim() || null,
      avatarUrl: info.picture ?? null,
    };
  },
};

const github: ProviderDefinition = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  scopes: ["read:user", "user:email"],
  async fetchProfile(accessToken, timeoutMs) {
    const headers = { "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "TestPulse" };
    const userJson = await getJson("https://api.github.com/user", accessToken, timeoutMs, headers);
    const user = GitHubUserSchema.safeParse(userJson);
    if (!user.success) throw new ProviderError("GitHub profile response had an unexpected shape.");

    // Never trust the profile `email` field: it is the user's public, unverified display email.
    // Only the primary address that GitHub marks verified is acceptable (security model §2.3).
    const emailsJson = await getJson("https://api.github.com/user/emails", accessToken, timeoutMs, headers);
    const emails = GitHubEmailsSchema.safeParse(emailsJson);
    if (!emails.success) throw new ProviderError("GitHub emails response had an unexpected shape.");
    const primary = emails.data.find((entry) => entry.primary && entry.verified);

    return {
      providerAccountId: String(user.data.id),
      email: normalizeEmail(primary?.email),
      emailVerified: primary !== undefined,
      name: user.data.name?.trim() || user.data.login,
      avatarUrl: user.data.avatar_url ?? null,
    };
  },
};

const DEFINITIONS: Record<OAuthProvider, ProviderDefinition> = { google, github };

export interface OAuthProviderClient {
  provider: OAuthProvider;
  createAuthorizationUrl(state: string, codeVerifier: string): URL;
  /** Exchanges the code (with the PKCE verifier) and loads the provider profile. Throws `ProviderError`. */
  exchangeAndFetchProfile(code: string, codeVerifier: string): Promise<ProviderProfile>;
}

function credentialsFor(env: ApiEnv, provider: OAuthProvider): { id: string; secret: string } | null {
  const id = provider === "google" ? env.GOOGLE_CLIENT_ID : env.GITHUB_CLIENT_ID;
  const secret = provider === "google" ? env.GOOGLE_CLIENT_SECRET : env.GITHUB_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

export function oauthRedirectUri(env: ApiEnv, provider: OAuthProvider): string {
  const base = (env.OAUTH_REDIRECT_BASE_URL ?? env.WEB_ORIGIN).replace(/\/+$/, "");
  return `${base}/api/v1/auth/oauth/${provider}/callback`;
}

/**
 * Builds the Authorization Code + PKCE (S256) client for a provider, or `null` when its credentials are
 * not configured. One generic client serves both providers so PKCE applies uniformly (arctic's GitHub
 * helper has no PKCE support).
 */
export function createProviderClient(env: ApiEnv, provider: OAuthProvider): OAuthProviderClient | null {
  const credentials = credentialsFor(env, provider);
  if (!credentials) return null;

  const definition = DEFINITIONS[provider];
  const client = new OAuth2Client(credentials.id, credentials.secret, oauthRedirectUri(env, provider));

  return {
    provider,
    createAuthorizationUrl(state, codeVerifier) {
      return client.createAuthorizationURLWithPKCE(
        definition.authorizationEndpoint,
        state,
        CodeChallengeMethod.S256,
        codeVerifier,
        definition.scopes,
      );
    },
    async exchangeAndFetchProfile(code, codeVerifier) {
      let accessToken: string;
      try {
        // arctic issues a bare fetch with no timeout; bound it so a hanging provider cannot hang the callback.
        const tokens = await withTimeout(
          client.validateAuthorizationCode(definition.tokenEndpoint, code, codeVerifier),
          env.OAUTH_PROVIDER_TIMEOUT_MS,
        );
        accessToken = tokens.accessToken();
      } catch (error) {
        if (
          error instanceof OAuth2RequestError ||
          error instanceof ArcticFetchError ||
          error instanceof UnexpectedResponseError ||
          error instanceof UnexpectedErrorResponseBodyError
        ) {
          throw new ProviderError("Provider rejected the authorization code exchange.");
        }
        // Missing/invalid access_token field in an otherwise successful response, or any other surprise.
        throw new ProviderError("Provider token response was unusable.");
      }
      return definition.fetchProfile(accessToken, env.OAUTH_PROVIDER_TIMEOUT_MS);
    },
  };
}
