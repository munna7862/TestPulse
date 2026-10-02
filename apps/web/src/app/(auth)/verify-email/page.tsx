"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from "@testpulse/ui";
import { ApiError, authClient } from "@/lib/auth-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [loading, setLoading] = useState(Boolean(tokenFromUrl));
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenFromUrl) {
      void handleVerify(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  async function handleVerify(tokenToVerify: string) {
    setLoading(true);
    setError(null);

    try {
      await authClient.verifyEmail({ token: tokenToVerify.trim() });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to verify email. The token may be expired or already used.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <CardTitle as="h1" className="text-2xl font-bold">
            Verifying your email
          </CardTitle>
          <CardDescription>Please wait while we confirm your verification link...</CardDescription>
        </CardHeader>
        <CardContent className="py-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-status-passed-bg text-status-passed flex items-center justify-center text-xl font-bold">
            ✓
          </div>
          <CardTitle as="h1" className="text-2xl font-bold">
            Email verified!
          </CardTitle>
          <CardDescription className="text-base text-surface-foreground/80">
            Your email has been verified. You can now access your workspaces and team projects.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-4">
          <Button asChild className="w-full">
            <Link href="/login">Continue to Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-surface-border">
      <CardHeader className="text-center space-y-1">
        <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
          Verify your email
        </CardTitle>
        <CardDescription>Enter the verification code or token sent to your email inbox</CardDescription>
      </CardHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (token) void handleVerify(token);
        }}
      >
        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 text-sm rounded-md bg-status-failed-bg text-status-failed border border-status-failed/20"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="verify-token" className="text-sm font-medium text-surface-foreground">
              Verification token
            </label>
            <Input
              id="verify-token"
              type="text"
              required
              placeholder="Paste verification token here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={!token.trim()}>
            Verify email
          </Button>

          <p className="text-xs text-center text-surface-muted">
            Back to{" "}
            <Link href="/login" className="text-primary-link font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
