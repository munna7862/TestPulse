"use client";

import { Building2, Check, ChevronDown, Layers, Plus, RefreshCw } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from "@testpulse/ui";
import { canManageProjects, formatMemberRole } from "../lib/workspace";
import { useWorkspace } from "../providers/WorkspaceProvider";

function SelectableItem({
  selected,
  label,
  meta,
  onSelect,
}: {
  selected: boolean;
  label: string;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2">
        <Check
          className={`h-3.5 w-3.5 shrink-0 ${selected ? "text-primary opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        />
        <span className="truncate font-medium text-foreground">{label}</span>
      </span>
      {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
    </DropdownMenuItem>
  );
}

/** Header switcher for organizations, projects, and creation dialogs. */
export function WorkspaceSwitcher() {
  const w = useWorkspace();

  if (w.orgsStatus === "loading") {
    return (
      <div className="flex items-center">
        <span className="sr-only">Loading workspace</span>
        <Skeleton className="h-8 w-44" />
      </div>
    );
  }

  if (w.orgsStatus === "error") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Workspace unavailable"
            className="h-8 gap-2 text-xs font-normal"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Workspace unavailable</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>{w.orgsError ?? "We couldn't load your organizations."}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => w.refreshOrgs()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Switch organization or project"
          className="h-8 gap-2 text-xs font-normal hover:bg-muted"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="max-w-28 truncate font-semibold text-foreground">
            {w.activeOrg ? w.activeOrg.name : "Create organization"}
          </span>
          {w.activeOrg && (
            <>
              <span className="text-muted-foreground">/</span>
              <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="max-w-28 truncate text-foreground">{w.activeProject?.name ?? "No project"}</span>
            </>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {w.orgs.length === 0 && <DropdownMenuItem disabled>No organizations yet</DropdownMenuItem>}
        {w.orgs.map((org) => (
          <SelectableItem
            key={org.id}
            selected={org.id === w.activeOrg?.id}
            label={org.name}
            meta={formatMemberRole(org.role)}
            onSelect={() => w.selectOrg(org.id)}
          />
        ))}
        <DropdownMenuItem onSelect={() => w.setCreateOrgOpen(true)} className="gap-2">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New organization</span>
        </DropdownMenuItem>
        {w.activeOrg && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Projects</DropdownMenuLabel>
            {w.projectsStatus === "loading" && <DropdownMenuItem disabled>Loading projects...</DropdownMenuItem>}
            {w.projectsStatus === "error" && (
              <DropdownMenuItem onSelect={() => w.refreshProjects()} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{w.projectsError ? `${w.projectsError} Retry` : "Retry loading projects"}</span>
              </DropdownMenuItem>
            )}
            {w.projectsStatus === "ready" && w.projects.length === 0 && (
              <DropdownMenuItem disabled>No projects in this org</DropdownMenuItem>
            )}
            {w.projectsStatus === "ready" &&
              w.projects.map((p) => (
                <SelectableItem
                  key={p.id}
                  selected={p.id === w.activeProject?.id}
                  label={p.name}
                  onSelect={() => w.selectProject(p.id)}
                />
              ))}
            {canManageProjects(w.activeOrg.role) && (
              <DropdownMenuItem onSelect={() => w.setCreateProjectOpen(true)} className="gap-2">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>New project</span>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
