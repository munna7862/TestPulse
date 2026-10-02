import { type OAuthErrorCode, OAuthErrorCodeSchema, type OAuthProvider, OAuthProviderSchema } from "@testpulse/shared";

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ["google", "github"];

export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};

/** Same-origin link that begins an OAuth sign-in. A plain navigation: the API answers with a redirect. */
export function oauthStartHref(provider: OAuthProvider): string {
  return `/api/v1/auth/oauth/${provider}/start`;
}

export interface OAuthErrorContent {
  title: string;
  message: string;
  /** Optional second action beyond "Back to sign in". */
  secondary?: { href: string; label: string };
}

/**
 * Friendly copy for each failure the API can redirect to `/oauth/error`. Copy never repeats provider
 * error text or the user's email: only the opaque code and provider arrive in the URL.
 */
export function oauthErrorContent(
  code: OAuthErrorCode | undefined,
  provider: OAuthProvider | undefined,
): OAuthErrorContent {
  const name = provider ? PROVIDER_LABELS[provider] : "your provider";
  switch (code) {
    case "ACCESS_DENIED":
      return {
        title: "Sign-in cancelled",
        message: "You cancelled the request, so nothing was changed. You can try again whenever you're ready.",
      };
    case "INVALID_STATE":
      return {
        title: "This sign-in attempt has expired",
        message:
          "For your security, a social sign-in must be finished in the same browser within 10 minutes. Please start again.",
      };
    case "PROVIDER_ERROR":
      return {
        title: `We couldn't complete sign-in with ${name}`,
        message: `${name} didn't finish the request. Please try again in a moment, or sign in with your email and password.`,
      };
    case "PROVIDER_NOT_CONFIGURED":
      return {
        title: `${name} sign-in isn't available`,
        message:
          "This workspace hasn't turned on that sign-in option yet. Use another sign-in method or ask your administrator.",
      };
    case "EMAIL_UNVERIFIED":
      return {
        title: `Your ${name} email isn't verified`,
        message: `We can only use an email address that ${name} has verified. Verify it with ${name} and try again, or sign in with your email and password.`,
      };
    case "EMAIL_CONFLICT":
      return {
        title: "An account with this email already exists",
        message: `Sign in with your existing method (email and password), then link ${name} from Settings › Profile. If you haven't verified that email address yet, verify it first.`,
      };
    case "ACCOUNT_ALREADY_LINKED":
      return {
        title: `That ${name} account can't be linked`,
        message: `It's already connected to a different TestPulse account, or you've already linked another ${name} account. Disconnect it first or use a different account.`,
        secondary: { href: "/settings/profile", label: "Go to profile settings" },
      };
    case "ACCOUNT_DISABLED":
      return {
        title: "This account is unavailable",
        message: "The account has been deactivated. Contact support if you think this is a mistake.",
      };
    default:
      return {
        title: "We couldn't sign you in",
        message: "Something went wrong while signing in. Please try again.",
      };
  }
}

/** Reads a single query parameter (Next.js passes `string | string[] | undefined`). */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Validates the untrusted `code`/`provider` query values of the error page. Unknown values become `undefined`. */
export function parseOAuthErrorParams(params: { code?: string | string[]; provider?: string | string[] }): {
  code: OAuthErrorCode | undefined;
  provider: OAuthProvider | undefined;
} {
  const code = OAuthErrorCodeSchema.safeParse(first(params.code));
  const provider = OAuthProviderSchema.safeParse(first(params.provider));
  return { code: code.success ? code.data : undefined, provider: provider.success ? provider.data : undefined };
}
