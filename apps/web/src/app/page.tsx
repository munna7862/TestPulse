import Link from "next/link";
import { Activity, ArrowRight, LayoutDashboard, Terminal } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, StatusBadge } from "@testpulse/ui";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
          <span className="flex h-2 w-2 rounded-full bg-status-passed" />
          <span>TestPulse Design System Foundation (P02-S06)</span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">TestPulse</h1>
          </div>
          <h2 className="text-xl font-semibold text-foreground">See your tests. In real time.</h2>
          <p className="text-base text-muted-foreground max-w-2xl">
            Real-time test execution monitoring, collaborative flaky test triage, and automated quarantine lifecycle
            management.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <Button asChild size="lg">
            <Link href="/runs">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Enter App Shell
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/dev/ui">
              <Terminal className="h-4 w-4 mr-2" />
              Explore Component Catalog
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 pt-6 border-t border-border">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Real-Time Monitoring</CardDescription>
              <CardTitle as="h3" className="text-base font-semibold">
                Live Streaming UI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Socket.IO event stream with sub-100ms visual progress updates and connection resilience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Flakiness Triage</CardDescription>
              <CardTitle as="h3" className="text-base font-semibold">
                Automated Scoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status="flaky" size="sm" />
                <StatusBadge status="quarantined" size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                Automated quarantine lifecycle with non-blocking CI annotations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Accessibility First</CardDescription>
              <CardTitle as="h3" className="text-base font-semibold">
                WCAG 2.1 AA Compliant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                No-flash theme switching (System / Light / Dark) with verified contrast ratios.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
