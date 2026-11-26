"use client";

import { useEffect, useState } from "react";
import type { ApiKey, ApiKeyStatus, CreatedApiKey } from "@testpulse/shared";
import { KeyRound, Plus, ShieldAlert, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@testpulse/ui";
import { CreateApiKeyDialog } from "@/components/CreateApiKeyDialog";
import { apiKeysClient, canManageApiKeys, formatApiKeyError } from "@/lib/api-keys";
import { useWorkspace } from "@/providers/WorkspaceProvider";

function formatTimestamp(iso: string | null, emptyText: string): string {
  if (!iso) return emptyText;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadgeVariant(status: ApiKeyStatus): "default" | "secondary" | "destructive" {
  if (status === "ACTIVE") return "default";
  if (status === "REVOKED") return "destructive";
  return "secondary";
}

interface ListState {
  fetchKey: string;
  keys: ApiKey[];
  error: string | null;
}

export function ApiKeysManagement() {
  const { activeOrg, activeProject, orgsStatus, projectsStatus } = useWorkspace();
  const [listState, setListState] = useState<ListState>({ fetchKey: "", keys: [], error: null });
  const [reloadTick, setReloadTick] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const canManage = activeOrg ? canManageApiKeys(activeOrg.role) : false;
  const projectId = activeOrg && activeProject && canManage ? activeProject.id : "";
  const targetFetchKey = projectId ? `${projectId}:${reloadTick}` : "";

  useEffect(() => {
    if (!projectId || !targetFetchKey) return;

    const controller = new AbortController();
    apiKeysClient
      .listApiKeys(projectId, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setListState({ fetchKey: targetFetchKey, keys: rows, error: null });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setListState({
          fetchKey: targetFetchKey,
          keys: [],
          error: formatApiKeyError(error, "We couldn't load API keys right now. Please try again."),
        });
      });

    return () => controller.abort();
  }, [projectId, targetFetchKey]);

  const loading = Boolean(targetFetchKey) && listState.fetchKey !== targetFetchKey;
  const loadError = loading || !targetFetchKey ? null : listState.error;
  const keys = loading || !targetFetchKey ? [] : listState.keys;

  function handleCreated(created: CreatedApiKey) {
    // Retain only metadata fields in table state; plaintextKey stays strictly inside the open reveal dialog.
    const metadata: ApiKey = {
      id: created.id,
      orgId: created.orgId,
      projectId: created.projectId,
      name: created.name,
      prefix: created.prefix,
      createdById: created.createdById,
      createdByName: created.createdByName,
      lastUsedAt: created.lastUsedAt,
      expiresAt: created.expiresAt,
      revokedAt: created.revokedAt,
      status: created.status,
      createdAt: created.createdAt,
    };
    setListState((prev) => ({
      fetchKey: targetFetchKey,
      error: null,
      keys: [metadata, ...prev.keys.filter((k) => k.id !== metadata.id)],
    }));
  }

  async function handleConfirmRevoke() {
    if (!activeProject || !revokeTarget) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      await apiKeysClient.revokeApiKey(activeProject.id, revokeTarget.id);
      const revokedAt = new Date().toISOString();
      setListState((prev) => ({
        ...prev,
        keys: prev.keys.map((item) =>
          item.id === revokeTarget.id ? { ...item, revokedAt, status: "REVOKED" as const } : item,
        ),
      }));
      setRevokeTarget(null);
    } catch (error) {
      setRevokeError(formatApiKeyError(error, "We couldn't revoke this API key right now. Please try again."));
    } finally {
      setRevoking(false);
    }
  }

  const pageHeader = (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">API keys</h1>
      <p className="text-sm text-muted-foreground">
        Generate and revoke project-scoped keys for CI test run ingestion.
      </p>
    </div>
  );

  if (orgsStatus === "loading" || projectsStatus === "loading") {
    return (
      <div className="space-y-6">
        {pageHeader}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3" role="status" aria-label="Loading workspace">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeOrg || !activeProject) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={KeyRound}
              title="Select a project first"
              description="Create or select an organization and project from the workspace switcher to manage its CI API keys."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span>Project API keys</span>
            </CardTitle>
            <CardDescription>Only organization owners and admins can manage project API keys.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageHeader}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle>Project keys</CardTitle>
            <CardDescription>
              Manage project-scoped CI ingestion keys for{" "}
              <span className="font-medium text-foreground">{activeProject.name}</span>.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            <span>Generate API key</span>
          </Button>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div role="status" aria-label="Loading API keys" className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
            >
              <span>{loadError}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setReloadTick((tick) => tick + 1)}>
                Retry
              </Button>
            </div>
          ) : keys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No API keys yet"
              description="Generate a project API key to stream Playwright or Vitest runs from CI."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                        {`tp_live_${item.prefix}…`}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.createdByName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTimestamp(item.lastUsedAt, "Never")}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTimestamp(item.expiresAt, "Never")}</TableCell>
                    <TableCell className="text-right">
                      {item.status !== "REVOKED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`Revoke ${item.name}`}
                          onClick={() => {
                            setRevokeError(null);
                            setRevokeTarget(item);
                          }}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          <span>Revoke</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Revoked</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={activeProject.id}
        projectName={activeProject.name}
        onCreated={handleCreated}
      />

      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
            setRevokeError(null);
          }
        }}
      >
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              Revoking <span className="font-medium text-foreground">{revokeTarget?.name}</span> stops CI ingestion
              requests using this key immediately. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {revokeError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground"
            >
              {revokeError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={revoking}
              onClick={() => {
                setRevokeTarget(null);
                setRevokeError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={revoking}
              onClick={() => {
                void handleConfirmRevoke();
              }}
            >
              {revoking ? "Revoking..." : "Revoke key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
