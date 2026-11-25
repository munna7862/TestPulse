import {
  type CreateOrgBody,
  CreateOrgBodySchema,
  type CreateProjectBody,
  CreateProjectBodySchema,
  hasOrgRole,
  type Org,
  type OrgRole,
  OrgSchema,
  PLAN_LIMITS,
  type PlanTier,
  type Project,
  ProjectSchema,
  type UpdateProjectBody,
} from "@testpulse/shared";
import { z } from "zod";
import { ApiClientError, type ApiClientOptions, createApiClient } from "./api-client";

export const STORAGE_ORG_KEY = "testpulse-active-org-id";
export const STORAGE_PROJECT_KEY = "testpulse-active-project-id";
export type OnboardingStep = "create-org" | "create-project" | "ready";
export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface WorkspaceClient {
  listOrgs: (signal?: AbortSignal) => Promise<Org[]>;
  createOrg: (body: CreateOrgBody) => Promise<Org>;
  listProjects: (orgId: string, signal?: AbortSignal) => Promise<Project[]>;
  createProject: (orgId: string, body: CreateProjectBody) => Promise<Project>;
  updateProject: (projectId: string, body: UpdateProjectBody) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
}

/** Picks a preferred org when present, or falls back to the first membership. */
export const resolveActiveOrg = (orgs: readonly Org[], preferredId: string | null): Org | null =>
  (preferredId ? orgs.find((o) => o.id === preferredId) : undefined) ?? orgs[0] ?? null;

/** Picks a preferred project when present, or falls back to the first project. */
export const resolveActiveProject = (projects: readonly Project[], preferredId: string | null): Project | null =>
  (preferredId ? projects.find((p) => p.id === preferredId) : undefined) ?? projects[0] ?? null;

/** Computes the current first-run onboarding step. */
export const getOnboardingStep = (orgs: readonly Org[], projects: readonly Project[]): OnboardingStep =>
  orgs.length === 0 ? "create-org" : projects.length === 0 ? "create-project" : "ready";

/** True when the caller can create, edit, or delete projects. */
export const canManageProjects = (role: OrgRole): boolean => hasOrgRole(role, "ADMIN");

/** Effective retention days capped by the organization plan limit. */
export const effectiveRetentionDays = (requestedDays: number, planTier: PlanTier): number =>
  Math.min(requestedDays, PLAN_LIMITS[planTier].retentionDays);

/** Formats an org role enum for display. */
export const formatMemberRole = (role: OrgRole): string => role.charAt(0) + role.slice(1).toLowerCase();

const PLAN_LABELS: Readonly<Record<PlanTier, string>> = { FREE: "Free", PRO: "Pro", ENTERPRISE: "Enterprise" };

/** Computes sidebar plan tier label and project quota summary. */
export function getPlanQuotaSummary(planTier: PlanTier, projectCount: number) {
  const limits = PLAN_LIMITS[planTier];
  const projectSummary =
    limits.projectsPerOrg === null
      ? `${projectCount} projects (unlimited)`
      : `${projectCount} / ${limits.projectsPerOrg} projects`;
  const usagePct =
    limits.projectsPerOrg === null ? 0 : Math.min(100, Math.round((projectCount / limits.projectsPerOrg) * 100));
  return { tierLabel: `${PLAN_LABELS[planTier]} Tier`, projectSummary, usagePct, retentionDays: limits.retentionDays };
}

/** Validates create-organization inputs against `@testpulse/shared`. */
export function validateCreateOrgInput(name: string, slug: string): ValidationResult<CreateOrgBody> {
  const s = slug.trim();
  const parsed = CreateOrgBodySchema.safeParse({ name, ...(s ? { slug: s } : {}) });
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, error: parsed.error.issues[0]?.message ?? "Check your organization details." };
}

/** Validates create-project inputs against `@testpulse/shared`. */
export function validateCreateProjectInput(
  name: string,
  slug: string,
  description: string,
): ValidationResult<CreateProjectBody> {
  const s = slug.trim();
  const d = description.trim();
  const parsed = CreateProjectBodySchema.safeParse({
    name,
    ...(s ? { slug: s } : {}),
    ...(d ? { description: d } : {}),
  });
  return parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, error: parsed.error.issues[0]?.message ?? "Check your project details." };
}

const ERROR_COPY: Readonly<Record<string, string>> = {
  CONFLICT: "That slug already exists. Choose a different slug or name.",
  PLAN_LIMIT_REACHED: "You have reached your plan limit. Delete an unused item or upgrade your plan.",
  FORBIDDEN: "You do not have permission to perform this action.",
  EMAIL_NOT_VERIFIED: "Verify your email address before creating an organization.",
  NOT_FOUND: "This organization or project could not be found. Refresh and try again.",
  UNAUTHENTICATED: "Your session has expired. Sign in again to continue.",
  VALIDATION_ERROR: "Check the form fields and fix any highlighted values.",
};

/** Maps API errors to safe copy without raw codes or HTTP status numbers. */
export const formatWorkspaceError = (error: unknown, fallback: string): string =>
  error instanceof ApiClientError ? (ERROR_COPY[error.error.code] ?? fallback) : fallback;

/** Safely reads an active workspace ID from browser localStorage. */
export function readStoredId(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

/** Safely writes or clears an active workspace ID in browser localStorage. */
export function writeStoredId(key: string, value: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable in restricted contexts.
  }
}

/** Typed API client for organization and project workspace calls. */
export function createWorkspaceClient(options?: ApiClientOptions): WorkspaceClient {
  const req = createApiClient(options);
  return {
    listOrgs: (signal) => req({ path: "/api/v1/orgs", schema: z.array(OrgSchema), ...(signal ? { signal } : {}) }),
    createOrg: (body) => req({ path: "/api/v1/orgs", method: "POST", body, schema: OrgSchema }),
    listProjects: (orgId, signal) =>
      req({
        path: `/api/v1/orgs/${encodeURIComponent(orgId)}/projects`,
        schema: z.array(ProjectSchema),
        ...(signal ? { signal } : {}),
      }),
    createProject: (orgId, body) =>
      req({ path: `/api/v1/orgs/${encodeURIComponent(orgId)}/projects`, method: "POST", body, schema: ProjectSchema }),
    updateProject: (projectId, body) =>
      req({ path: `/api/v1/projects/${encodeURIComponent(projectId)}`, method: "PATCH", body, schema: ProjectSchema }),
    deleteProject: (projectId) =>
      req({ path: `/api/v1/projects/${encodeURIComponent(projectId)}`, method: "DELETE", schema: z.undefined() }),
  };
}

export const workspaceClient = createWorkspaceClient();
