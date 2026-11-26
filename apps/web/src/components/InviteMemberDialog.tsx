"use client";

import { type AssignableOrgRole, type Invitation, PLAN_LIMITS, type PlanTier } from "@testpulse/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@testpulse/ui";
import * as React from "react";
import { formatMemberActionError, INVITE_ROLE_OPTIONS, membersClient, validateInviteInput } from "../lib/members";
import { formatMemberRole } from "../lib/workspace";

interface InviteMemberDialogProps {
  orgId: string;
  planTier: PlanTier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (invitation: Invitation) => void;
}

export function InviteMemberDialog({ orgId, planTier, open, onOpenChange, onCreated }: InviteMemberDialogProps) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<AssignableOrgRole>("MEMBER");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const close = () => {
    setEmail("");
    setRole("MEMBER");
    setError(null);
    onOpenChange(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validateInviteInput(email, role);
    if (!v.ok) return setError(v.error);
    setSubmitting(true);
    try {
      const created = await membersClient.createInvitation(orgId, v.data);
      onCreated(created);
      close();
    } catch (err) {
      setError(formatMemberActionError(err, "We couldn't send this invitation. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  const limit = PLAN_LIMITS[planTier].membersPerOrg;
  const quotaHint =
    limit === null
      ? "Unlimited seats on your current plan."
      : `Pending invitations count toward your ${limit}-seat plan limit.`;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : !submitting && close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite teammate</DialogTitle>
          <DialogDescription>Send a 7-day email invitation link. {quotaHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-status-failed/20 bg-status-failed-bg p-3 text-sm text-status-failed"
            >
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
              Email address
            </label>
            <Input
              id="invite-email"
              type="email"
              required
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="invite-role" className="text-sm font-medium text-foreground">
              Role
            </label>
            <Select value={role} onValueChange={(v) => setRole(v as AssignableOrgRole)} disabled={submitting}>
              <SelectTrigger id="invite-role" aria-label="Invitation role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITE_ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {formatMemberRole(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
