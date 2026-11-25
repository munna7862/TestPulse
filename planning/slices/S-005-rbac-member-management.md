# S-005: Shared RBAC permission map & member management (P03-S04 part 1/3)

Milestone: P03 Auth & Multi-Tenancy · Appetite: 1 session · Risk: medium (RBAC privilege boundaries, concurrent ownership transfer / demotion races)
Replaces or covers: P03-S04 tasks 5–8 (`FR-ORG-04`, `FR-ORG-08`, `FR-ORG-09`)

## Outcome
`@testpulse/shared` becomes the single source of truth for the 24-action RBAC permission matrix (master plan §7.1), powering both Fastify tenant route guards and Web UI controls; organization Admins and Owners can change non-Owner member roles and remove non-Owner members, any non-Owner member can leave an organization, and access removals/downgrades emit a post-commit `member.access_changed` domain event for future socket eviction (P05-S01).

## Acceptance criteria (EARS)
- AC1 When `PERMISSIONS`, `PermissionAction`, `can(role, action)`, `rolesWithPermission(action)`, and `minRoleFor(action)` are evaluated across all 24 actions × 4 roles from `docs/security/rbac-matrix.md` (`[SC-ORG-016]`), every `(role, action)` pair shall match the matrix (including `member.leave` allowed for `ADMIN | MEMBER | VIEWER` and denied for `OWNER`).
- AC2 When any org or project route in `apps/api/src/plugins/tenant-context.ts` is registered (`[SC-SEC-002]`), its policy entry shall name a `PermissionAction` (deriving `minRole` via `minRoleFor(action)`) and authorize via `can(role, action)` — with `DELETE /api/v1/orgs/:orgId/members/:userId` permitting self-targeting callers when `can(role, "member.leave")` is true — and Web `canManageProjects` shall delegate to `can(role, "project.create")`.
- AC3 When an Admin or Owner submits `PATCH /api/v1/orgs/:orgId/members/:userId` with `{ role }` in `["ADMIN", "MEMBER", "VIEWER"]` (`[SC-ORG-014]`, `[SC-ORG-006]`), the API shall update another non-Owner member's role and return `200` (`OrgMemberResponseSchema`); if a Member/Viewer calls it, or an Admin targets the Owner, it shall return `403`; if targeting self or `{ role: "OWNER" }`, it shall return `400`; if the target is not a member, malformed, or cross-tenant, it shall return `404`.
- AC4 When a caller invokes `DELETE /api/v1/orgs/:orgId/members/:userId` (`[SC-ORG-015]`, `[SC-ORG-006]`), an Admin or Owner removing another non-Owner member or a non-Owner member removing themselves (self-leave) shall delete the membership inside a transaction and return `204` (causing immediate `404` on subsequent org calls); an Owner attempting self-leave, an Admin/Member/Viewer attempting to remove the Owner, or a non-Admin targeting another member shall receive `403`, and non-members/cross-tenant targets shall receive `404`.
- AC5 When a member removal, self-leave, or role downgrade (`newRole` rank < `previousRole` rank) commits (`[SC-ORG-015]`), the API shall enqueue `"member.access_changed"` on the `"domain-events"` BullMQ queue with Zod-validated payload `{ orgId, userId, reason, previousRole, newRole }` after commit; if enqueueing fails, the error shall be forwarded to `onEnqueueError` without failing the `200`/`204` HTTP response.

## Non-goals
- `Invitation` Prisma model, invite/list/revoke/resend/accept endpoints, and invitation emails (next slice: **S-006**).
- Web members/invitations settings pages and invite acceptance flow (**S-007**).
- Socket.IO gateway listener consuming `member.access_changed` (**P05-S01**).

## Contracts touched (read only these sections)
- `planning/master/TestPulse_Master_Plan.md` §5 (`OrgMember`), §6.2 (`domain-events` queue), §7 (`Roles` & `Isolation rules`).
- `docs/security/rbac-matrix.md` (all 24 Action IDs) & `docs/api/rest-api.md` §2.
- Shared schemas/exports: `packages/shared/src/permissions.ts`, `packages/shared/src/api/orgs.ts`.

## Risks to test explicitly
- Isolation & privilege escalation: 404 for cross-tenant/non-members/malformed `:userId` (`P2023` prevention), 403 for Member promoting self or removing others, 403 for Admin changing/removing Owner, 400 for `{ role: "OWNER" }` or self-role-change, 403 for Owner self-leave.
- Races: write-time role re-check when an Admin is demoted before `PATCH`/`DELETE` commits, and conditional `role: { not: "OWNER" }` delete guarding against concurrent `transferOwnership`.
- Queue resilience: `"member.access_changed"` post-commit delivery, no enqueue on promotions or rejected requests, and non-blocking `onEnqueueError` handling when Redis is down.

## Tests written first
- `packages/shared/src/permissions.acceptance.test.ts` covers AC1 (`[SC-ORG-016]`).
- `apps/api/test/orgs/members.acceptance.test.ts` covers AC2–AC5 (`[SC-ORG-006]`, `[SC-ORG-014]`, `[SC-ORG-015]`, `[SC-SEC-002]`).

## Done means
Required checks green · claims, security and test audits pass with zero unaddressed proved findings · PR merged with green CI on `main`.
