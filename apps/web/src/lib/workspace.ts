import {
  type CreateOrgBody,
  type CreateProjectBody,
  type Org,
  type OrgRole,
  type PlanTier,
  type Project,
  type UpdateProjectBody,
} from "@testpulse/shared";
import type { ApiClientOptions } from "./api-client";

export const STORAGE_ORG_KEY = "testpulse-active-org-id";
export const STORAGE_PROJECT_KEY = "testpulse-active-project-id";

export type OnboardingStep = "create-org" | "create-project" | "ready";

export interface WorkspaceClient {
  listOrgs: (signal?: AbortSignal) => Promise<Org[]>;
  createOrg: (body: CreateOrgBody) => Promise<Org>;
  listProjects: (orgId: string, signal?: AbortSignal) => Promise<Project[]>;
  createProject: (orgId: string, body: CreateProjectBody) => Promise<Project>;
  updateProject: (projectId: string, body: UpdateProjectBody) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
}

const unimplemented = (): never => {
  throw new Error("Not implemented: S-004");
};

export function resolveActiveOrg(_orgs: readonly Org[], _preferredId: string | null): Org | null {
  return unimplemented();
}

export function resolveActiveProject(_projects: readonly Project[], _preferredId: string | null): Project | null {
  return unimplemented();
}

export function getOnboardingStep(_orgs: readonly Org[], _projects: readonly Project[]): OnboardingStep {
  return unimplemented();
}

export function canManageProjects(_role: OrgRole): boolean {
  return unimplemented();
}

export function effectiveRetentionDays(_requestedDays: number, _planTier: PlanTier): number {
  return unimplemented();
}

export function formatWorkspaceError(_error: unknown, _fallback: string): string {
  return unimplemented();
}

export function createWorkspaceClient(_options?: ApiClientOptions): WorkspaceClient {
  return {
    listOrgs: () => Promise.reject(new Error("Not implemented: S-004")),
    createOrg: () => Promise.reject(new Error("Not implemented: S-004")),
    listProjects: () => Promise.reject(new Error("Not implemented: S-004")),
    createProject: () => Promise.reject(new Error("Not implemented: S-004")),
    updateProject: () => Promise.reject(new Error("Not implemented: S-004")),
    deleteProject: () => Promise.reject(new Error("Not implemented: S-004")),
  };
}
