"use client";

import { type LinkedOAuthAccount, type OAuthProvider } from "@testpulse/shared";
import { Button, Skeleton } from "@testpulse/ui";
import { useCallback, useEffect, useState } from "react";
import { ApiError, authClient } from "@/lib/auth-client";
import { OAUTH_PROVIDERS, PROVIDER_LABELS } from "@/lib/oauth";
import { ProviderIcon } from "./ProviderIcon";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; accounts: LinkedOAuthAccount[]; hasPassword: boolean };

function messageFor(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Profile-settings section: which social accounts can sign in to this user, with link / unlink actions. */
export function LinkedAccounts({ justLinked }: { justLinked?: OAuthProvider | undefined }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchState = useCallback(async (): Promise<LoadState> => {
    try {
      const data = await authClient.listOAuthAccounts();
      return { status: "ready", accounts: data.accounts, hasPassword: data.hasPassword };
    } catch (error) {
      return { status: "error", message: messageFor(error, "We couldn't load your linked accounts.") };
    }
  }, []);

  /** Re-fetches after the first load (retry, or after an unlink). */
  const reload = useCallback(async () => {
    setState({ status: "loading" });
    setState(await fetchState());
  }, [fetchState]);

  // The state starts as "loading", so the first fetch only sets state once the response has arrived.
  useEffect(() => {
    let cancelled = false;
    void fetchState().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchState]);

  async function connect(provider: OAuthProvider) {
    setPending(provider);
    setActionError(null);
    try {
      const { authorizationUrl } = await authClient.startOAuthLink(provider);
      window.location.assign(authorizationUrl);
    } catch (error) {
      setActionError(messageFor(error, `We couldn't start linking ${PROVIDER_LABELS[provider]}. Please try again.`));
      setPending(null);
    }
  }

  async function disconnect(account: LinkedOAuthAccount) {
    setPending(account.provider);
    setActionError(null);
    try {
      await authClient.unlinkOAuthAccount(account.id);
      await reload();
    } catch (error) {
      setActionError(messageFor(error, `We couldn't disconnect ${PROVIDER_LABELS[account.provider]}.`));
    } finally {
      setPending(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-3" data-testid="linked-accounts-loading">
        <span className="sr-only" role="status">
          Loading linked accounts
        </span>
        {OAUTH_PROVIDERS.map((provider) => (
          <Skeleton key={provider} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-3">
        <div
          role="alert"
          className="p-3 text-sm rounded-md bg-status-failed-bg text-status-failed border border-status-failed/20"
        >
          {state.message}
        </div>
        <Button variant="outline" size="sm" onClick={() => void reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {justLinked && (
        <div
          role="status"
          className="p-3 text-sm rounded-md bg-status-passed-bg text-status-passed border border-status-passed/20"
        >
          {PROVIDER_LABELS[justLinked]} is now linked. You can use it to sign in.
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="p-3 text-sm rounded-md bg-status-failed-bg text-status-failed border border-status-failed/20"
        >
          {actionError}
        </div>
      )}

      {state.accounts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No social accounts are linked yet. Link one to sign in with a single click.
        </p>
      )}

      <ul className="divide-y divide-border rounded-md border border-border" aria-label="Social sign-in providers">
        {OAUTH_PROVIDERS.map((provider) => {
          const account = state.accounts.find((candidate) => candidate.provider === provider);
          const busy = pending === provider;
          const label = PROVIDER_LABELS[provider];
          return (
            <li key={provider} className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3">
                <ProviderIcon provider={provider} className="h-5 w-5 text-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {account ? `Linked ${new Date(account.createdAt).toLocaleDateString()}` : "Not linked"}
                  </p>
                </div>
              </div>
              {account ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  aria-label={`Disconnect ${label}`}
                  onClick={() => void disconnect(account)}
                >
                  {busy ? "Disconnecting..." : "Disconnect"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending !== null}
                  aria-label={`Connect ${label}`}
                  onClick={() => void connect(provider)}
                >
                  {busy ? "Redirecting..." : "Connect"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {!state.hasPassword && (
        <p className="text-xs text-muted-foreground">
          You sign in only with social accounts. Keep at least one linked, or set a password from the “Forgot password”
          page, before disconnecting.
        </p>
      )}
    </div>
  );
}
