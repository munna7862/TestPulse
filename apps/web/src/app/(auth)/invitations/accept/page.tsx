"use client";

import { type Org } from "@testpulse/shared";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from "@testpulse/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ApiError, authClient } from "@/lib/auth-client";
import { buildInvitationAcceptPath, formatInviteAcceptError, membersClient } from "@/lib/members";
import { formatMemberRole, STORAGE_ORG_KEY, STORAGE_PROJECT_KEY, writeStoredId } from "@/lib/workspace";

type AcceptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "unverified"; email: string; resentNotice: string | null }
  | { kind: "wrong-email"; email: string; message: string }
  | { kind: "accepted"; org: Org }
  | { kind: "error"; message: string };

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = (searchParams.get("token") ?? "").trim();

  const [manualToken, setManualToken] = useState(tokenFromUrl);
  const [state, setState] = useState<AcceptState>(tokenFromUrl ? { kind: "loading" } : { kind: "idle" });
  const [busy, setBusy] = useState(false);
  const autoAttemptedRef = useRef<string | null>(null);

  const returnToPath = buildInvitationAcceptPath(tokenFromUrl || manualToken);
  const authQuery = `?returnTo=${encodeURIComponent(returnToPath)}`;

  const processToken = useCallback(async (rawToken: string) => {
    const cleanToken = rawToken.trim();
    if (!cleanToken) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });
    try {
      let user;
      try {
        user = await authClient.getMe();
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 401) {
          setState({ kind: "anon" });
          return;
        }
        throw err;
      }
      if (!user.emailVerifiedAt) {
        setState({ kind: "unverified", email: user.email, resentNotice: null });
        return;
      }
      try {
        const org = await membersClient.acceptInvitation(cleanToken);
        writeStoredId(STORAGE_ORG_KEY, org.id);
        writeStoredId(STORAGE_PROJECT_KEY, null);
        setState({ kind: "accepted", org });
      } catch (err) {
        const mapped = formatInviteAcceptError(err);
        if (mapped.code === "FORBIDDEN") {
          setState({ kind: "wrong-email", email: user.email, message: mapped.message });
        } else if (mapped.code === "EMAIL_NOT_VERIFIED") {
          setState({ kind: "unverified", email: user.email, resentNotice: null });
        } else {
          setState({ kind: "error", message: mapped.message });
        }
      }
    } catch {
      setState({ kind: "error", message: "We couldn't accept this invitation right now. Please try again." });
    }
  }, []);

  useEffect(() => {
    if (!tokenFromUrl || autoAttemptedRef.current === tokenFromUrl) return;
    autoAttemptedRef.current = tokenFromUrl;
    void processToken(tokenFromUrl);
  }, [tokenFromUrl, processToken]);

  async function handleResendVerification(email: string) {
    setBusy(true);
    try {
      const res = await authClient.resendVerification(email);
      setState((prev) => (prev.kind === "unverified" ? { ...prev, resentNotice: res.message } : prev));
    } catch {
      setState((prev) =>
        prev.kind === "unverified"
          ? { ...prev, resentNotice: "Couldn't send a verification email right now. Try again shortly." }
          : prev,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitchAccount() {
    setBusy(true);
    try {
      await authClient.logout();
    } catch {
      // Still route to sign-in so the user can switch accounts even if logout fails.
    } finally {
      setBusy(false);
      router.push(`/login${authQuery}`);
    }
  }

  if (state.kind === "loading") {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <CardTitle as="h1" className="text-2xl font-bold">
            Accepting invitation
          </CardTitle>
          <CardDescription>Please wait while we confirm your workspace invitation...</CardDescription>
        </CardHeader>
        <CardContent className="py-8 flex justify-center">
          <div
            role="status"
            aria-label="Checking invitation"
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          />
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "anon") {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <CardTitle as="h1" className="text-2xl font-bold">
            Sign in to accept your invitation
          </CardTitle>
          <CardDescription>
            Sign in or create an account with the invited email address, then return here automatically.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href={`/login${authQuery}`}>Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/register${authQuery}`}>Create account</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (state.kind === "unverified") {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <CardTitle as="h1" className="text-2xl font-bold">
            Verify your email first
          </CardTitle>
          <CardDescription>
            Confirm ownership of <span className="font-semibold text-foreground">{state.email}</span> before joining
            this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.resentNotice && (
            <div role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">
              {state.resentNotice}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" disabled={busy} onClick={() => void handleResendVerification(state.email)}>
            Resend verification email
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void processToken(tokenFromUrl || manualToken)}
          >
            Check verification status
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (state.kind === "wrong-email") {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <CardTitle as="h1" className="text-2xl font-bold">
            Wrong account signed in
          </CardTitle>
          <CardDescription>
            You are signed in as <span className="font-semibold text-foreground">{state.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="alert"
            className="rounded-md border border-status-failed/20 bg-status-failed-bg p-3 text-sm text-status-failed"
          >
            {state.message}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" disabled={busy} onClick={() => void handleSwitchAccount()}>
            Sign out to switch account
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/runs">Back to workspace</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (state.kind === "accepted") {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-passed-bg text-xl font-bold text-status-passed">
            ✓
          </div>
          <CardTitle as="h1" className="text-2xl font-bold">
            Invitation accepted!
          </CardTitle>
          <CardDescription className="text-base text-surface-foreground/80">
            You joined <span className="font-semibold text-foreground">{state.org.name}</span> as{" "}
            <span className="font-semibold text-foreground">{formatMemberRole(state.org.role)}</span>.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-4">
          <Button asChild className="w-full">
            <Link href="/runs">Open workspace</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <CardTitle as="h1" className="text-2xl font-bold">
            Invitation unavailable
          </CardTitle>
          <CardDescription>This invitation link could not be completed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="alert"
            className="rounded-md border border-status-failed/20 bg-status-failed-bg p-3 text-sm text-status-failed"
          >
            {state.message}
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/runs">Go to workspace</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-surface-border">
      <CardHeader className="text-center space-y-1">
        <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
          Accept invitation
        </CardTitle>
        <CardDescription>Paste the invitation token from your email to join the workspace.</CardDescription>
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void processToken(manualToken);
        }}
      >
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="invitation-token" className="text-sm font-medium text-surface-foreground">
              Invitation token
            </label>
            <Input
              id="invitation-token"
              type="text"
              required
              placeholder="Paste invitation token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={!manualToken.trim()}>
            Accept invitation
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <Card className="shadow-lg border-surface-border text-center">
          <CardHeader>
            <CardTitle as="h1">Loading...</CardTitle>
          </CardHeader>
        </Card>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
