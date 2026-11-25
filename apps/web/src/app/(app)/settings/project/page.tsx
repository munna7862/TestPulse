"use client";

import { type Project, SlaDaysSchema } from "@testpulse/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@testpulse/ui";
import * as React from "react";
import {
  canManageProjects,
  formatEffectiveRetentionHint,
  formatWorkspaceError,
  validateUpdateProjectInput,
  workspaceClient,
} from "../../../../lib/workspace";
import { useWorkspace } from "../../../../providers/WorkspaceProvider";

const SLA_OPTIONS = SlaDaysSchema.options.map((literal) => literal.value);

export default function ProjectSettingsPage() {
  const w = useWorkspace();

  if (w.orgsStatus === "loading" || (w.activeOrg && w.projectsStatus === "loading")) {
    return (
      <div className="space-y-6">
        <HeaderBlock />
        <div className="space-y-3" data-testid="project-settings-loading">
          <span className="sr-only" role="status">
            Loading project settings
          </span>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (w.orgsStatus === "error") {
    return (
      <div className="space-y-6">
        <HeaderBlock />
        <ErrorBanner message={w.orgsError ?? "We couldn't load your organizations."} onRetry={() => w.refreshOrgs()} />
      </div>
    );
  }

  if (!w.activeOrg) {
    return (
      <div className="space-y-6">
        <HeaderBlock />
        <EmptyState
          title="No organization selected"
          description="Create an organization before configuring project settings."
          action={<Button onClick={() => w.setCreateOrgOpen(true)}>Create organization</Button>}
        />
      </div>
    );
  }

  if (w.projectsStatus === "error") {
    return (
      <div className="space-y-6">
        <HeaderBlock />
        <ErrorBanner
          message={w.projectsError ?? "We couldn't load projects for this organization."}
          onRetry={() => w.refreshProjects()}
        />
      </div>
    );
  }

  if (!w.activeProject) {
    const canCreate = canManageProjects(w.activeOrg.role);
    return (
      <div className="space-y-6">
        <HeaderBlock />
        <EmptyState
          title="No projects in this organization"
          description={
            canCreate
              ? `Create your first project under ${w.activeOrg.name} to configure branch, SLA, and retention settings.`
              : "Ask an organization Admin or Owner to create a project."
          }
          action={canCreate ? <Button onClick={() => w.setCreateProjectOpen(true)}>Create project</Button> : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeaderBlock />
      <ProjectSettingsForm
        key={w.activeProject.id}
        project={w.activeProject}
        planTier={w.activeOrg.planTier}
        onUpdated={w.onProjectUpdated}
        onDeleted={w.onProjectDeleted}
      />
    </div>
  );
}

function HeaderBlock() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Project settings</h1>
      <p className="text-sm text-muted-foreground">
        Configure defaults, quarantine SLA windows, and data retention for the active project.
      </p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3">
      <div
        role="alert"
        className="rounded-md border border-status-failed/20 bg-status-failed-bg p-3 text-sm text-status-failed"
      >
        {message}
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function ProjectSettingsForm({
  project,
  planTier,
  onUpdated,
  onDeleted,
}: {
  project: Project;
  planTier: "FREE" | "PRO" | "ENTERPRISE";
  onUpdated: (project: Project) => void;
  onDeleted: (projectId: string) => void;
}) {
  const canEdit = canManageProjects(project.role);
  const [name, setName] = React.useState(project.name);
  const [description, setDescription] = React.useState(project.description ?? "");
  const [defaultBranch, setDefaultBranch] = React.useState(project.defaultBranch);
  const [slaDays, setSlaDays] = React.useState(String(project.slaDays));
  const [retentionDays, setRetentionDays] = React.useState(String(project.retentionDays));
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    setError(null);
    setSaved(false);
    const validated = validateUpdateProjectInput({ name, description, defaultBranch, slaDays, retentionDays });
    if (!validated.ok) return setError(validated.error);

    setSaving(true);
    try {
      onUpdated(await workspaceClient.updateProject(project.id, validated.data));
      setSaved(true);
    } catch (err) {
      setError(formatWorkspaceError(err, "We couldn't update project settings."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canEdit) return;
    setError(null);
    setDeleting(true);
    try {
      await workspaceClient.deleteProject(project.id);
      setDeleteOpen(false);
      onDeleted(project.id);
    } catch (err) {
      setDeleteOpen(false);
      setError(formatWorkspaceError(err, "We couldn't delete this project."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">
            General &amp; retention
          </CardTitle>
          <CardDescription>
            Project slug: <span className="font-mono">{project.slug}</span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={(e) => void handleSave(e)} noValidate>
          <CardContent className="space-y-4">
            {!canEdit && (
              <p className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">
                Only Admins and Owners can edit or delete project settings.
              </p>
            )}
            {saved && (
              <div
                role="status"
                className="rounded-md border border-status-passed/20 bg-status-passed-bg p-3 text-sm text-status-passed"
              >
                Project settings saved.
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-md border border-status-failed/20 bg-status-failed-bg p-3 text-sm text-status-failed"
              >
                {error}
              </div>
            )}
            <Input
              id="project-name"
              label="Project name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              disabled={!canEdit || saving}
            />
            <Input
              id="project-description"
              label="Description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSaved(false);
              }}
              disabled={!canEdit || saving}
            />
            <Input
              id="project-branch"
              label="Default branch"
              required
              value={defaultBranch}
              onChange={(e) => {
                setDefaultBranch(e.target.value);
                setSaved(false);
              }}
              disabled={!canEdit || saving}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  id="project-sla-label"
                  htmlFor="project-sla"
                  className="block text-sm font-medium text-foreground"
                >
                  Quarantine SLA
                </label>
                <Select
                  value={slaDays}
                  onValueChange={(value) => {
                    setSlaDays(value);
                    setSaved(false);
                  }}
                  disabled={!canEdit || saving}
                >
                  <SelectTrigger id="project-sla" aria-labelledby="project-sla-label">
                    <SelectValue placeholder="Select SLA" />
                  </SelectTrigger>
                  <SelectContent>
                    {SLA_OPTIONS.map((days) => (
                      <SelectItem key={days} value={String(days)}>
                        {days} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                id="project-retention"
                type="number"
                min={1}
                max={365}
                label="Data retention (days)"
                value={retentionDays}
                helperText={formatEffectiveRetentionHint(retentionDays, project.retentionDays, planTier)}
                onChange={(e) => {
                  setRetentionDays(e.target.value);
                  setSaved(false);
                }}
                disabled={!canEdit || saving}
              />
            </div>
          </CardContent>
          {canEdit && (
            <CardFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {canEdit && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              Danger zone
            </CardTitle>
            <CardDescription>
              Deleting a project immediately hides its runs and queues permanent cleanup.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete project
            </Button>
          </CardFooter>
        </Card>
      )}

      <Dialog open={deleteOpen} onOpenChange={(next) => !deleting && setDeleteOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {project.name}? Test runs and history will be queued for permanent
              removal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting..." : "Confirm delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
