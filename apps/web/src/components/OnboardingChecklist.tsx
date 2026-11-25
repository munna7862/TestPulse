"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@testpulse/ui";
import { canManageProjects, getOnboardingStep } from "../lib/workspace";
import { useWorkspace } from "../providers/WorkspaceProvider";

/** First-run golden-path checklist for organization and first project creation. */
export function OnboardingChecklist() {
  const { orgs, activeOrg, projects, setCreateOrgOpen, setCreateProjectOpen } = useWorkspace();
  const step = getOnboardingStep(orgs, projects);
  if (step === "ready") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-lg font-semibold">
          Get started with TestPulse
        </CardTitle>
        <CardDescription>Complete these steps to prepare your workspace for live CI runs.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          <li className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {orgs.length > 0 ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-passed" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">1. Create your organization</p>
                <p className="text-xs text-muted-foreground">
                  {activeOrg ? `Active: ${activeOrg.name}` : "Set up your team workspace and plan quota."}
                </p>
              </div>
            </div>
            {orgs.length === 0 && (
              <Button size="sm" onClick={() => setCreateOrgOpen(true)}>
                Create organization
              </Button>
            )}
          </li>
          <li className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">2. Create your first project</p>
                <p className="text-xs text-muted-foreground">
                  {activeOrg && !canManageProjects(activeOrg.role)
                    ? "Ask an organization Admin or Owner to create the first project."
                    : "Configure retention and SLA defaults for your test suite."}
                </p>
              </div>
            </div>
            {step === "create-project" && activeOrg && canManageProjects(activeOrg.role) && (
              <Button size="sm" onClick={() => setCreateProjectOpen(true)}>
                Create project
              </Button>
            )}
          </li>
          <li className="flex items-start gap-3 rounded-md border border-border p-3">
            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">3. Connect your CI reporter</p>
              <p className="text-xs text-muted-foreground">
                Install <span className="font-mono">@testpulse/reporter</span> once your project is ready.
              </p>
            </div>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
