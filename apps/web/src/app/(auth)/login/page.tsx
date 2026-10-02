"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from "@testpulse/ui";
import { ApiError, authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authClient.login({ email, password });
      router.push("/runs");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-lg border-surface-border">
      <CardHeader className="text-center space-y-1">
        <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
          Sign in to TestPulse
        </CardTitle>
        <CardDescription>Enter your email and password to access your team workspaces</CardDescription>
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
              className="p-3 text-sm rounded-md bg-status-failed-bg text-status-failed border border-status-failed/20 flex items-center gap-2"
            >
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm font-medium text-surface-foreground">
              Email address
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-sm font-medium text-surface-foreground">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-primary-link hover:underline transition-colors">
                Forgot password?
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-xs text-center text-surface-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary-link font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
