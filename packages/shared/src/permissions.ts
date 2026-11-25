import { z } from "zod";
import type { OrgRole } from "./api/orgs";

/** Action IDs from docs/security/rbac-matrix.md and master plan §7.1. */
export const PermissionActionSchema = z.enum([
  "org.read",
  "org.update",
  "org.delete",
  "org.transferOwnership",
  "org.audit.read",
  "member.invite",
  "member.changeRole",
  "member.remove",
  "member.leave",
  "project.read",
  "project.create",
  "project.update",
  "project.delete",
  "apiKey.manage",
  "webhook.manage",
  "notificationDefaults.manage",
  "quarantine.create",
  "quarantine.transition",
  "annotation.create",
  "annotation.editOwn",
  "annotation.deleteAny",
  "label.manage",
  "export.read",
  "realtime.joinProject",
]);
export type PermissionAction = z.infer<typeof PermissionActionSchema>;

function notImplemented(): never {
  throw new Error("Not implemented: S-005");
}

export const PERMISSIONS: Readonly<Record<PermissionAction, readonly OrgRole[]>> = {} as Readonly<
  Record<PermissionAction, readonly OrgRole[]>
>;

export function can(_role: OrgRole, _action: PermissionAction): boolean {
  return notImplemented();
}

export function rolesWithPermission(_action: PermissionAction): readonly OrgRole[] {
  return notImplemented();
}

export function minRoleFor(_action: PermissionAction): OrgRole {
  return notImplemented();
}
