"use client";

import { type Org, type Project } from "@testpulse/shared";
import * as React from "react";
import {
  formatWorkspaceError,
  readStoredId,
  resolveActiveOrg,
  resolveActiveProject,
  STORAGE_ORG_KEY,
  STORAGE_PROJECT_KEY,
  workspaceClient,
  writeStoredId,
} from "../lib/workspace";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

interface SliceState<T> {
  status: LoadStatus;
  error: string | null;
  items: T[];
  activeId: string | null;
  tick: number;
}

export interface WorkspaceContextValue {
  orgsStatus: LoadStatus;
  orgsError: string | null;
  orgs: Org[];
  activeOrg: Org | null;
  projectsStatus: LoadStatus;
  projectsError: string | null;
  projects: Project[];
  activeProject: Project | null;
  selectOrg: (orgId: string) => void;
  selectProject: (projectId: string) => void;
  refreshOrgs: () => void;
  refreshProjects: () => void;
  onOrgCreated: (org: Org) => void;
  onProjectCreated: (project: Project) => void;
  createOrgOpen: boolean;
  setCreateOrgOpen: (open: boolean) => void;
  createProjectOpen: boolean;
  setCreateProjectOpen: (open: boolean) => void;
}

const Ctx = React.createContext<WorkspaceContextValue | null>(null);
const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

/** Provides active organization and project state, localStorage persistence, and creation dialogs. */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [oState, setOState] = React.useState<SliceState<Org>>({
    status: "loading",
    error: null,
    items: [],
    activeId: null,
    tick: 0,
  });
  const [pState, setPState] = React.useState<SliceState<Project>>({
    status: "idle",
    error: null,
    items: [],
    activeId: null,
    tick: 0,
  });
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false);
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);

  React.useEffect(() => {
    const ac = new AbortController();
    void workspaceClient.listOrgs(ac.signal).then(
      (items) => {
        if (ac.signal.aborted) return;
        const resolved = resolveActiveOrg(items, readStoredId(STORAGE_ORG_KEY));
        writeStoredId(STORAGE_ORG_KEY, resolved?.id ?? null);
        setOState((s) => ({ ...s, status: "ready", error: null, items, activeId: resolved?.id ?? null }));
        setPState((s) => ({
          ...s,
          status: resolved ? "loading" : "idle",
          error: null,
          ...(resolved ? { tick: s.tick + 1 } : { items: [], activeId: null }),
        }));
      },
      (err: unknown) => {
        if (ac.signal.aborted || isAbort(err)) return;
        setOState((s) => ({
          ...s,
          status: "error",
          error: formatWorkspaceError(err, "We couldn't load your organizations."),
        }));
      },
    );
    return () => ac.abort();
  }, [oState.tick]);

  React.useEffect(() => {
    if (!oState.activeId) return;
    const ac = new AbortController();
    void workspaceClient.listProjects(oState.activeId, ac.signal).then(
      (items) => {
        if (ac.signal.aborted) return;
        const resolved = resolveActiveProject(items, readStoredId(STORAGE_PROJECT_KEY));
        writeStoredId(STORAGE_PROJECT_KEY, resolved?.id ?? null);
        setPState((s) => ({ ...s, status: "ready", error: null, items, activeId: resolved?.id ?? null }));
      },
      (err: unknown) => {
        if (ac.signal.aborted || isAbort(err)) return;
        setPState((s) => ({
          ...s,
          status: "error",
          error: formatWorkspaceError(err, "We couldn't load projects for this organization."),
        }));
      },
    );
    return () => ac.abort();
  }, [oState.activeId, pState.tick]);

  const selectOrg = (id: string) => {
    writeStoredId(STORAGE_ORG_KEY, id);
    writeStoredId(STORAGE_PROJECT_KEY, null);
    setOState((s) => ({ ...s, activeId: id }));
    setPState((s) => ({ ...s, status: "loading", error: null, items: [], activeId: null }));
  };

  const value: WorkspaceContextValue = {
    orgsStatus: oState.status,
    orgsError: oState.error,
    orgs: oState.items,
    activeOrg: resolveActiveOrg(oState.items, oState.activeId),
    projectsStatus: pState.status,
    projectsError: pState.error,
    projects: pState.items,
    activeProject: resolveActiveProject(pState.items, pState.activeId),
    selectOrg,
    selectProject: (id) => {
      writeStoredId(STORAGE_PROJECT_KEY, id);
      setPState((s) => ({ ...s, activeId: id }));
    },
    refreshOrgs: () => setOState((s) => ({ ...s, status: "loading", error: null, tick: s.tick + 1 })),
    refreshProjects: () =>
      oState.activeId && setPState((s) => ({ ...s, status: "loading", error: null, tick: s.tick + 1 })),
    onOrgCreated: (org) => {
      setOState((s) => ({ ...s, status: "ready", items: [...s.items, org], activeId: org.id }));
      selectOrg(org.id);
    },
    onProjectCreated: (project) => {
      writeStoredId(STORAGE_PROJECT_KEY, project.id);
      setPState((s) => ({ ...s, status: "ready", error: null, items: [...s.items, project], activeId: project.id }));
    },
    createOrgOpen,
    setCreateOrgOpen,
    createProjectOpen,
    setCreateProjectOpen,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Reads workspace state from `WorkspaceProvider`. */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
