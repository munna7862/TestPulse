import { z } from "zod";
import { hasOrgRole, type OrgRole } from "./api/orgs";

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

const ALL_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
const NON_OWNER_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;
const ADMIN_AND_OWNER = ["OWNER", "ADMIN"] as const;
const CONTRIBUTOR_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
const OWNER_ONLY = ["OWNER"] as const;

/**
 * Single-source action permission map (docs/security/rbac-matrix.md, master plan §7.1).
 * Both Fastify tenant guards and React UI controls evaluate access from this table.
 */
export const PERMISSIONS: Readonly<Record<PermissionAction, readonly OrgRole[]>> = {
  "org.read": ALL_ROLES,
  "org.update": ADMIN_AND_OWNER,
  "org.delete": OWNER_ONLY,
  "org.transferOwnership": OWNER_ONLY,
  "org.audit.read": ADMIN_AND_OWNER,
  "member.invite": ADMIN_AND_OWNER,
  "member.changeRole": ADMIN_AND_OWNER,
  "member.remove": ADMIN_AND_OWNER,
  "member.leave": NON_OWNER_ROLES,
  "project.read": ALL_ROLES,
  "project.create": ADMIN_AND_OWNER,
  "project.update": ADMIN_AND_OWNER,
  "project.delete": ADMIN_AND_OWNER,
  "apiKey.manage": ADMIN_AND_OWNER,
  "webhook.manage": ADMIN_AND_OWNER,
  "notificationDefaults.manage": ADMIN_AND_OWNER,
  "quarantine.create": CONTRIBUTOR_ROLES,
  "quarantine.transition": CONTRIBUTOR_ROLES,
  "annotation.create": CONTRIBUTOR_ROLES,
  "annotation.editOwn": CONTRIBUTOR_ROLES,
  "annotation.deleteAny": ADMIN_AND_OWNER,
  "label.manage": CONTRIBUTOR_ROLES,
  "export.read": ALL_ROLES,
  "realtime.joinProject": ALL_ROLES,
};

/** Returns true when `role` is permitted to execute `action`. */
export function can(role: OrgRole, action: PermissionAction): boolean {
  return PERMISSIONS[action].includes(role);
}

/** Lists every role permitted to perform `action`. */
export function rolesWithPermission(action: PermissionAction): readonly OrgRole[] {
  return PERMISSIONS[action];
}

const ROLE_ASCENDING: readonly OrgRole[] = ["VIEWER", "MEMBER", "ADMIN", "OWNER"];

/** Returns the lowest-ranked role present in `PERMISSIONS[action]`. */
export function minRoleFor(action: PermissionAction): OrgRole {
  const allowed = PERMISSIONS[action];
  const min = ROLE_ASCENDING.find((role) => allowed.includes(role) && hasOrgRole(role, role));
  if (!min) throw new Error(`Action "${action}" grants no roles.`);
  return min;
}
