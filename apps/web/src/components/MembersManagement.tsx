"use client";

import { type AssignableOrgRole, type Invitation, type Org, type OrgMember } from "@testpulse/shared";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@testpulse/ui";
import * as React from "react";
import { authClient } from "../lib/auth-client";
import {
  canEditTargetMember,
  formatMemberActionError,
  getMemberPermissions,
  getMemberQuotaSummary,
  INVITE_ROLE_OPTIONS,
  membersClient,
  validateRoleChangeInput,
} from "../lib/members";
import { formatMemberRole, STORAGE_ORG_KEY, STORAGE_PROJECT_KEY, writeStoredId } from "../lib/workspace";
import { useWorkspace } from "../providers/WorkspaceProvider";
import { InviteMemberDialog } from "./InviteMemberDialog";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; members: OrgMember[]; invitations: Invitation[]; currentUserId: string | null };

export function MembersManagement() {
  const w = useWorkspace();

  if (w.orgsStatus === "loading") {
    return (
      <div className="space-y-6">
        <HeaderBlock />
        <div className="space-y-3" data-testid="members-loading">
          <span className="sr-only" role="status">
            Loading members
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
          description="Create an organization before managing members and invitations."
          action={<Button onClick={() => w.setCreateOrgOpen(true)}>Create organization</Button>}
        />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <HeaderBlock />
      <OrgMembersPanel key={w.activeOrg.id} org={w.activeOrg} onOrgLeft={() => w.refreshOrgs()} />
    </div>
  );
}

function HeaderBlock() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Members &amp; invitations</h1>
      <p className="text-sm text-muted-foreground">Manage organization roles, seat limits, and pending invitations.</p>
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

function ConfirmActionDialog(props: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && !props.busy && props.onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel} disabled={props.busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={props.onConfirm} disabled={props.busy}>
            {props.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrgMembersPanel({ org, onOrgLeft }: { org: Org; onOrgLeft: () => void }) {
  const perms = getMemberPermissions(org.role);
  const [state, setState] = React.useState<LoadState>({ status: "loading" });
  const [tick, setTick] = React.useState(0);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<OrgMember | null>(null);
  const [leaveOpen, setLeaveOpen] = React.useState(false);

  React.useEffect(() => {
    const ac = new AbortController();
    void Promise.all([
      membersClient.listMembers(org.id, ac.signal),
      perms.invite ? membersClient.listInvitations(org.id, ac.signal) : Promise.resolve([]),
      authClient.getMe().then(
        (u): string | null => u.id,
        (): null => null,
      ),
    ]).then(
      ([members, invitations, currentUserId]) => {
        if (!ac.signal.aborted) setState({ status: "ready", members, invitations, currentUserId });
      },
      (err: unknown) => {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setState({
          status: "error",
          message: formatMemberActionError(err, "We couldn't load members for this organization."),
        });
      },
    );
    return () => ac.abort();
  }, [org.id, perms.invite, tick]);

  if (state.status === "loading") {
    return (
      <div className="space-y-3" data-testid="members-loading">
        <span className="sr-only" role="status">
          Loading members
        </span>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <ErrorBanner
        message={state.message}
        onRetry={() => {
          setState({ status: "loading" });
          setActionError(null);
          setTick((t) => t + 1);
        }}
      />
    );
  }

  const quota = getMemberQuotaSummary(org.planTier, state.members.length, state.invitations.length);
  const currentUserId = state.currentUserId ?? "";

  async function runAction(key: string, fallback: string, fn: () => Promise<void>) {
    setActionError(null);
    setBusyKey(key);
    try {
      await fn();
    } catch (err) {
      setActionError(formatMemberActionError(err, fallback));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <div
          role="alert"
          className="rounded-md border border-status-failed/20 bg-status-failed-bg p-3 text-sm text-status-failed"
        >
          {actionError}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle as="h2" className="text-lg">
              Team members
            </CardTitle>
            <CardDescription>{quota.label}</CardDescription>
            {perms.invite && quota.atLimit && (
              <p className="text-xs font-medium text-muted-foreground">
                Member limit reached — upgrade to Pro or remove a pending invite to add teammates.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {perms.invite && (
              <Button disabled={quota.atLimit} onClick={() => setInviteOpen(true)}>
                Invite member
              </Button>
            )}
            {perms.leave && (
              <Button variant="outline" onClick={() => setLeaveOpen(true)}>
                Leave organization
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {state.members.map((m) => {
              const caps = canEditTargetMember(org.role, currentUserId, m);
              const rowBusy = busyKey === `role:${m.userId}` || busyKey === `remove:${m.userId}`;
              return (
                <li key={m.userId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-foreground">{m.name}</span>
                      <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>{formatMemberRole(m.role)}</Badge>
                      {m.userId === currentUserId && <Badge variant="outline">You</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                  </div>
                  {(caps.changeRole || caps.remove) && (
                    <div className="flex items-center gap-2">
                      {caps.changeRole && (
                        <Select
                          value={m.role}
                          disabled={rowBusy}
                          onValueChange={(next) => {
                            const v = validateRoleChangeInput(next);
                            if (!v.ok) return setActionError(v.error);
                            void runAction(`role:${m.userId}`, "We couldn't update that member's role.", async () => {
                              const updated = await membersClient.changeMemberRole(org.id, m.userId, v.data);
                              setState((p) =>
                                p.status === "ready"
                                  ? { ...p, members: p.members.map((x) => (x.userId === m.userId ? updated : x)) }
                                  : p,
                              );
                            });
                          }}
                        >
                          <SelectTrigger className="w-32" aria-label={`Role for ${m.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVITE_ROLE_OPTIONS.map((r: AssignableOrgRole) => (
                              <SelectItem key={r} value={r}>
                                {formatMemberRole(r)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {caps.remove && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Remove ${m.name}`}
                          onClick={() => setRemoveTarget(m)}
                          disabled={rowBusy}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {perms.invite && (
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">
              Pending invitations
            </CardTitle>
            <CardDescription>Active 7-day invitations awaiting acceptance.</CardDescription>
          </CardHeader>
          <CardContent>
            {state.invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invitations</p>
            ) : (
              <ul className="divide-y divide-border">
                {state.invitations.map((inv) => {
                  const invBusy = busyKey === `resend:${inv.id}` || busyKey === `revoke:${inv.id}`;
                  return (
                    <li
                      key={inv.id}
                      className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-foreground">{inv.email}</span>
                          <Badge variant="outline">{formatMemberRole(inv.role)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Invited by {inv.invitedByName} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Resend invite to ${inv.email}`}
                          disabled={invBusy}
                          onClick={() =>
                            void runAction(`resend:${inv.id}`, "We couldn't resend that invitation.", async () => {
                              const updated = await membersClient.resendInvitation(org.id, inv.id);
                              setState((p) =>
                                p.status === "ready"
                                  ? { ...p, invitations: p.invitations.map((x) => (x.id === inv.id ? updated : x)) }
                                  : p,
                              );
                            })
                          }
                        >
                          Resend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Revoke invite for ${inv.email}`}
                          disabled={invBusy}
                          onClick={() =>
                            void runAction(`revoke:${inv.id}`, "We couldn't revoke that invitation.", async () => {
                              await membersClient.revokeInvitation(org.id, inv.id);
                              setState((p) =>
                                p.status === "ready"
                                  ? { ...p, invitations: p.invitations.filter((x) => x.id !== inv.id) }
                                  : p,
                              );
                            })
                          }
                        >
                          Revoke
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {perms.invite && (
        <InviteMemberDialog
          orgId={org.id}
          planTier={org.planTier}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onCreated={(created) =>
            setState((p) => (p.status === "ready" ? { ...p, invitations: [created, ...p.invitations] } : p))
          }
        />
      )}

      <ConfirmActionDialog
        open={Boolean(removeTarget)}
        title="Remove member"
        description={
          removeTarget
            ? `Remove ${removeTarget.name} (${removeTarget.email}) from ${org.name}? They will immediately lose access.`
            : ""
        }
        confirmLabel="Confirm remove"
        busy={busyKey?.startsWith("remove:") ?? false}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return;
          const targetId = removeTarget.userId;
          void runAction(`remove:${targetId}`, "We couldn't remove that member.", async () => {
            try {
              await membersClient.removeMember(org.id, targetId);
              setState((p) =>
                p.status === "ready" ? { ...p, members: p.members.filter((m) => m.userId !== targetId) } : p,
              );
            } finally {
              setRemoveTarget(null);
            }
          });
        }}
      />

      <ConfirmActionDialog
        open={leaveOpen}
        title="Leave organization"
        description={`Leave ${org.name}? You will need a new invitation to rejoin this workspace.`}
        confirmLabel="Confirm leave"
        busy={busyKey === "leave"}
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => {
          if (!currentUserId) return;
          void runAction("leave", "We couldn't complete leaving this organization.", async () => {
            try {
              await membersClient.removeMember(org.id, currentUserId);
              writeStoredId(STORAGE_ORG_KEY, null);
              writeStoredId(STORAGE_PROJECT_KEY, null);
              onOrgLeft();
            } finally {
              setLeaveOpen(false);
            }
          });
        }}
      />
    </div>
  );
}
