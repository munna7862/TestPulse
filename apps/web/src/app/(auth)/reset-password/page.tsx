"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from "@testpulse/ui";
import { ApiError, authClient } from "@/lib/auth-client";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authClient.resetPassword({ token: token.trim(), newPassword });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to reset password. The link may have expired or already been used.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-status-passed-bg text-status-passed flex items-center justify-center text-xl font-bold">
            ✓
          </div>
          <CardTitle as="h1" className="text-2xl font-bold">
            Password reset complete!
          </CardTitle>
          <CardDescription className="text-base text-surface-foreground/80">
            Your password has been securely updated and all previous active sessions have been invalidated.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-4">
          <Button asChild className="w-full">
            <Link href="/login">Sign in with new password</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-surface-border">
      <CardHeader className="text-center space-y-1">
        <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
          Set new password
        </CardTitle>
        <CardDescription>Choose a strong password with at least 10 characters</CardDescription>
      </CardHeader>

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        noValidate
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

          {!tokenFromUrl && (
            <div className="space-y-2">
              <label htmlFor="reset-token" className="text-sm font-medium text-surface-foreground">
                Reset token
              </label>
              <Input
                id="reset-token"
                type="text"
                required
                placeholder="Paste token from reset email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="reset-new-password" className="text-sm font-medium text-surface-foreground">
              New password
            </label>
            <Input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="At least 10 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reset-confirm-password" className="text-sm font-medium text-surface-foreground">
              Confirm password
            </label>
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Resetting password..." : "Reset password"}
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

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
