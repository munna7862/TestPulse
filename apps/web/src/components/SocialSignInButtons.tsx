import { Button } from "@testpulse/ui";
import { OAUTH_PROVIDERS, oauthStartHref, PROVIDER_LABELS } from "@/lib/oauth";
import { ProviderIcon } from "./ProviderIcon";

/**
 * "Continue with Google / GitHub" for the auth pages. These are plain links, not client-side routes:
 * the API answers `/start` with a redirect to the provider and later sets the session cookies.
 */
export function SocialSignInButtons() {
  return (
    <div className="space-y-4">
      <div role="group" aria-label="Sign in with a social account" className="grid gap-3">
        {OAUTH_PROVIDERS.map((provider) => (
          <Button key={provider} variant="outline" className="w-full" asChild>
            <a href={oauthStartHref(provider)}>
              <ProviderIcon provider={provider} className="mr-2 h-4 w-4" />
              Continue with {PROVIDER_LABELS[provider]}
            </a>
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-surface-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-surface-border" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-surface-border" />
      </div>
    </div>
  );
}
