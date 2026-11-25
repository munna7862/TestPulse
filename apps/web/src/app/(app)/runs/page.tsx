"use client";

import * as React from "react";
import Link from "next/link";
import { PlayCircle, RefreshCw, Terminal } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  StatusBadge,
} from "@testpulse/ui";
import { OnboardingChecklist } from "../../../components/OnboardingChecklist";
import { getOnboardingStep } from "../../../lib/workspace";
import { useWorkspace } from "../../../providers/WorkspaceProvider";

export default function RunsPage() {
  const { orgsStatus, orgsError, orgs, activeOrg, projectsStatus, projects, activeProject, refreshOrgs } =
    useWorkspace();
  const showOnboarding =
    orgsStatus === "ready" &&
    (orgs.length === 0 || (projectsStatus === "ready" && getOnboardingStep(orgs, projects) === "create-project"));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Test Runs</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg && activeProject
              ? `Monitoring runs for ${activeOrg.name} / ${activeProject.name}.`
              : "Monitor test execution in real time across CI runners, branches, and shards."}
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

      {orgsStatus === "loading" && (
        <div data-testid="runs-workspace-loading">
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {orgsStatus === "error" && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base font-semibold">
              Workspace unavailable
            </CardTitle>
            <CardDescription>{orgsError ?? "We couldn't load your organizations right now."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => refreshOrgs()}>
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {showOnboarding && <OnboardingChecklist />}

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
