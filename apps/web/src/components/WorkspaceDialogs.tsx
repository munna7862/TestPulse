"use client";

import { checkLimit, slugify } from "@testpulse/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@testpulse/ui";
import * as React from "react";
import {
  formatWorkspaceError,
  validateCreateOrgInput,
  validateCreateProjectInput,
  type ValidationResult,
  workspaceClient,
} from "../lib/workspace";
import { useWorkspace } from "../providers/WorkspaceProvider";

interface FieldSpec {
  id: string;
  key: string;
  label: string;
  required?: boolean;
  placeholder: (values: Record<string, string>) => string;
  helperText?: string;
}

interface ResourceDialogProps<TBody, TResult> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  disabled?: boolean;
  notice?: string | null;
  fields: readonly FieldSpec[];
  validate: (values: Record<string, string>) => ValidationResult<TBody>;
  request: (body: TBody) => Promise<TResult>;
  fallbackError: string;
  onSuccess: (res: TResult) => void;
}

function ResourceDialog<TBody, TResult>(props: ResourceDialogProps<TBody, TResult>) {
  const { open, onOpenChange, title, description, submitLabel, disabled = false, notice, fields } = props;
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setValues({});
      setError(null);
    }
    onOpenChange(next);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setError(null);
    const v = props.validate(values);
    if (!v.ok) return setError(v.error);
    setSubmitting(true);
    try {
      props.onSuccess(await props.request(v.data));
      handleOpenChange(false);
    } catch (err) {
      setError(formatWorkspaceError(err, props.fallbackError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
          {notice && (
            <div role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-foreground">
              {notice}
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
          {fields.map((f) => (
            <Input
              key={f.id}
              id={f.id}
              label={f.label}
              required={f.required}
              placeholder={f.placeholder(values)}
              helperText={f.helperText}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              disabled={submitting || disabled}
            />
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || disabled}>
              {submitting ? "Creating..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ORG_FIELDS: readonly FieldSpec[] = [
  { id: "create-org-name", key: "name", label: "Organization name", required: true, placeholder: () => "Acme QA" },
  {
    id: "create-org-slug",
    key: "slug",
    label: "Slug",
    helperText: "Optional URL identifier.",
    placeholder: (v) => (v.name?.trim() ? slugify(v.name) : "my-organization"),
  },
];

const PROJECT_FIELDS: readonly FieldSpec[] = [
  { id: "create-project-name", key: "name", label: "Project name", required: true, placeholder: () => "Checkout Web" },
  {
    id: "create-project-slug",
    key: "slug",
    label: "Slug",
    placeholder: (v) => (v.name?.trim() ? slugify(v.name, "project") : "my-project"),
  },
  {
    id: "create-project-description",
    key: "description",
    label: "Description",
    placeholder: () => "Playwright end-to-end suite",
  },
];

/** Dialog for creating an organization with shared Zod validation. */
export function CreateOrgDialog() {
  const { createOrgOpen, setCreateOrgOpen, onOrgCreated } = useWorkspace();
  return (
    <ResourceDialog
      open={createOrgOpen}
      onOpenChange={setCreateOrgOpen}
      title="Create organization"
      description="Organizations hold your projects, team members, and test history."
      submitLabel="Create organization"
      fields={ORG_FIELDS}
      validate={(v) => validateCreateOrgInput(v.name ?? "", v.slug ?? "")}
      request={workspaceClient.createOrg}
      fallbackError="We couldn't create the organization. Please try again."
      onSuccess={onOrgCreated}
    />
  );
}

/** Dialog for creating a project inside the active organization, enforcing plan limits. */
export function CreateProjectDialog() {
  const { createProjectOpen, setCreateProjectOpen, activeOrg, projects, onProjectCreated } = useWorkspace();
  if (!activeOrg) return null;
  const limitReached = !checkLimit(activeOrg.planTier, "projectsPerOrg", projects.length).allowed;
  return (
    <ResourceDialog
      open={createProjectOpen}
      onOpenChange={setCreateProjectOpen}
      title="Create project"
      description={`Add a project under ${activeOrg.name} to collect CI runs and flaky test history.`}
      submitLabel="Create project"
      disabled={limitReached}
      notice={
        limitReached
          ? "Plan limit reached: delete an unused project or upgrade this organization to add another."
          : null
      }
      fields={PROJECT_FIELDS}
      validate={(v) => validateCreateProjectInput(v.name ?? "", v.slug ?? "", v.description ?? "")}
      request={(body) => workspaceClient.createProject(activeOrg.id, body)}
      fallbackError="We couldn't create the project. Please try again."
      onSuccess={onProjectCreated}
    />
  );
}
