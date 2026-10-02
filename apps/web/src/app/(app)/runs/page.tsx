import * as React from "react";
import Link from "next/link";
import { PlayCircle, Terminal } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusBadge,
} from "@testpulse/ui";

export default function RunsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Test Runs</h1>
          <p className="text-sm text-muted-foreground">
            Monitor test execution in real time across CI runners, branches, and shards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dev/ui">
              <Terminal className="h-4 w-4 mr-1.5" />
              Component Catalog
            </Link>
          </Button>
          <Button size="sm">
            <PlayCircle className="h-4 w-4 mr-1.5" />
            Simulate Run
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent Runs</CardDescription>
            <CardTitle className="text-2xl font-bold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Ready for CI connection</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pass Rate</CardDescription>
            <CardTitle className="text-2xl font-bold">100%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <StatusBadge status="passed" size="sm" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Flaky Tests</CardDescription>
            <CardTitle className="text-2xl font-bold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <StatusBadge status="flaky" size="sm" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quarantined</CardDescription>
            <CardTitle className="text-2xl font-bold">0</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <StatusBadge status="quarantined" size="sm" />
            </div>
          </CardContent>
        </Card>
      </div>

      <EmptyState
        title="No Test Runs Recorded"
        description="Run your Playwright or Vitest test suite using @testpulse/reporter in CI to stream execution data here live."
        action={
          <Button asChild>
            <Link href="/dev/ui">Explore Design System</Link>
          </Button>
        }
      />
    </div>
  );
}
