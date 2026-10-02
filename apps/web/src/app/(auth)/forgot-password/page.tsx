"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from "@testpulse/ui";
import { ApiError, authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authClient.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to request password reset. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <Card className="shadow-lg border-surface-border text-center">
        <CardHeader className="space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-status-passed-bg text-status-passed flex items-center justify-center text-xl font-bold">
            ✓
          </div>
          <CardTitle as="h1" className="text-2xl font-bold">
            Check your email
          </CardTitle>
          <CardDescription className="text-base text-surface-foreground/80">
            If an account exists for <span className="font-semibold">{email}</span>, we&apos;ve sent password reset
            instructions to that address.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-surface-muted">
          <p>
            Please check your spam folder if you do not see the email within a couple of minutes. The reset link will
            expire in 30 minutes.
          </p>
        </CardContent>
        <CardFooter className="pt-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Return to Sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-surface-border">
      <CardHeader className="text-center space-y-1">
        <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
          Reset your password
        </CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password
        </CardDescription>
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

          <div className="space-y-2">
            <label htmlFor="forgot-email" className="text-sm font-medium text-surface-foreground">
              Email address
            </label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending reset link..." : "Send reset link"}
          </Button>

          <p className="text-xs text-center text-surface-muted">
            Remember your password?{" "}
            <Link href="/login" className="text-primary-link font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
