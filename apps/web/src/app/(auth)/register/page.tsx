"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from "@testpulse/ui";
import { ApiError, authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    setLoading(true);

    try {
      await authClient.register({ name, email, password });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create account. Please try again.");
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
            If your email is not already registered, we&apos;ve sent a verification link to{" "}
            <span className="font-semibold text-surface-foreground">{email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-surface-muted">
          <p>
            Please click the link in that email to activate your account and access your team workspaces. The link will
            expire in 24 hours.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
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
          Create an account
        </CardTitle>
        <CardDescription>Start monitoring and triaging tests in real-time</CardDescription>
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
            <label htmlFor="register-name" className="text-sm font-medium text-surface-foreground">
              Full name
            </label>
            <Input
              id="register-name"
              type="text"
              autoComplete="name"
              required
              placeholder="Alex Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="register-email" className="text-sm font-medium text-surface-foreground">
              Work email
            </label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="register-password" className="text-sm font-medium text-surface-foreground">
              Password
            </label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="At least 10 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-surface-muted">Must be at least 10 characters long.</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-xs text-center text-surface-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-link font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
