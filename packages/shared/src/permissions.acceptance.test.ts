/**
 * Acceptance S-005 AC1 (docs/security/rbac-matrix.md, master plan §7.1):
 * evaluates the single-source permission map against every (role, action) cell.
 */
import { describe, expect, it } from "vitest";
import { can, minRoleFor, type OrgRole, type PermissionAction, PERMISSIONS, rolesWithPermission } from "./index";

const ROLES: readonly OrgRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

const EXPECTED_MATRIX: Readonly<Record<PermissionAction, readonly OrgRole[]>> = {
  "org.read": ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
  "org.update": ["OWNER", "ADMIN"],
  "org.delete": ["OWNER"],
  "org.transferOwnership": ["OWNER"],
  "org.audit.read": ["OWNER", "ADMIN"],
  "member.invite": ["OWNER", "ADMIN"],
  "member.changeRole": ["OWNER", "ADMIN"],
  "member.remove": ["OWNER", "ADMIN"],
  "member.leave": ["ADMIN", "MEMBER", "VIEWER"],
  "project.read": ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
  "project.create": ["OWNER", "ADMIN"],
  "project.update": ["OWNER", "ADMIN"],
  "project.delete": ["OWNER", "ADMIN"],
  "apiKey.manage": ["OWNER", "ADMIN"],
  "webhook.manage": ["OWNER", "ADMIN"],
  "notificationDefaults.manage": ["OWNER", "ADMIN"],
  "quarantine.create": ["OWNER", "ADMIN", "MEMBER"],
  "quarantine.transition": ["OWNER", "ADMIN", "MEMBER"],
  "annotation.create": ["OWNER", "ADMIN", "MEMBER"],
  "annotation.editOwn": ["OWNER", "ADMIN", "MEMBER"],
  "annotation.deleteAny": ["OWNER", "ADMIN"],
  "label.manage": ["OWNER", "ADMIN", "MEMBER"],
  "export.read": ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
  "realtime.joinProject": ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
};

describe("Acceptance S-005 AC1: shared RBAC permission map", () => {
  it("[SC-ORG-016] matches every (role, action) pair in docs/security/rbac-matrix.md", () => {
    const actions = Object.keys(EXPECTED_MATRIX) as PermissionAction[];
    expect(actions).toHaveLength(24);
    expect(Object.keys(PERMISSIONS).sort()).toEqual([...actions].sort());

    for (const action of actions) {
      const allowed = EXPECTED_MATRIX[action];
      expect(new Set(rolesWithPermission(action)), action).toEqual(new Set(allowed));
      for (const role of ROLES) {
        expect(can(role, action), `${role} -> ${action}`).toBe(allowed.includes(role));
      }
    }
  });

  it("[SC-ORG-016] derives minimum role for tenant route policies accurately", () => {
    expect(minRoleFor("org.read")).toBe("VIEWER");
    expect(minRoleFor("quarantine.create")).toBe("MEMBER");
    expect(minRoleFor("member.changeRole")).toBe("ADMIN");
    expect(minRoleFor("org.delete")).toBe("OWNER");
    expect(minRoleFor("member.leave")).toBe("VIEWER");
  });
});
