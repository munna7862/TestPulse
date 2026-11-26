export type AuditAction =
  | "org.ownership_transferred"
  | "org.deleted"
  | "project.created"
  | "project.deleted"
  | "member.role_changed"
  | "member.removed"
  | "member.left"
  | "invitation.created"
  | "invitation.resent"
  | "invitation.revoked"
  | "invitation.accepted"
  | "api_key.created"
  | "api_key.revoked";

export type AuditTargetType = "organization" | "project" | "org_member" | "invitation" | "api_key";

export type AuditMetadata = Record<string, string | number | boolean | null>;

export interface AuditEventWriter {
  auditEvent: {
    create(args: {
      data: {
        orgId: string;
        projectId?: string | null;
        actorUserId?: string | null;
        actorApiKeyId?: string | null;
        action: string;
        targetType: string;
        targetId: string;
        metadata: AuditMetadata;
      };
    }): Promise<unknown>;
  };
}

export interface RecordAuditEventInput {
  orgId: string;
  projectId?: string | null;
  actorUserId?: string | null;
  actorApiKeyId?: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  metadata?: AuditMetadata;
}

/** Appends one immutable audit event inside the caller's transaction so audit history commits or rolls back atomically. */
export async function recordAuditEvent(tx: AuditEventWriter, input: RecordAuditEventInput): Promise<void> {
  await tx.auditEvent.create({
    data: {
      orgId: input.orgId,
      projectId: input.projectId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorApiKeyId: input.actorApiKeyId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ?? {},
    },
  });
}
