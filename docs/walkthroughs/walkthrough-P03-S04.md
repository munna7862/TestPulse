# Walkthrough — P03-S04: Invitations, Member Management & RBAC

Completed across slices **S-005** (PR #21), **S-006** (PR #22), **S-007a** (PR #23), and **S-007b**:

## Delivered

1. **Single-Source RBAC Permission Matrix (`packages/shared/src/permissions.ts`)**
   - Unified `PERMISSIONS` map across all 24 actions aligned with `docs/security/rbac-matrix.md` and master plan §7.1, plus `can`, `rolesWithPermission`, and `minRoleFor`.
   - Enforced across API (`ORG_ROUTE_POLICY` / `PROJECT_ROUTE_POLICY` in `apps/api/src/plugins/tenant-context.ts`) and Web UI (`canManageProjects`, `getMemberPermissions`, `canEditTargetMember`).

2. **Member Role Management, Removal & Self-Leave (`apps/api/src/modules/orgs`)**
   - `PATCH /api/v1/orgs/:orgId/members/:userId` and `DELETE /api/v1/orgs/:orgId/members/:userId` with self-leave (`member.leave`) exception, Owner immutability guards, write-time caller verification under `Organization` `FOR UPDATE`, and post-commit `"member.access_changed"` events on `"domain-events"`.

3. **Invitations Lifecycle & Mailer (`packages/db`, `apps/api/src/modules/invitations`, `apps/api/src/lib/mailer`)**
   - Additive `Invitation` schema and migration (`20261125170000_invitations`), `MODEL_SCOPE` `"org"` classification, and `INVITATION_EXPIRED` / `INVITATION_REVOKED` error codes.
   - `GET/POST /api/v1/orgs/:orgId/invitations`, `POST .../resend`, `DELETE .../:id`, and `POST /api/v1/invitations/accept` (verified user + CSRF + per-IP rate limiting + `Organization FOR UPDATE` serialization + `tokenHash` atomic claim).
   - `Mailer.sendInvitationEmail` (`ConsoleMailer` redacted when `revealSecrets: false`) and `"member.invited"` domain event.

4. **Web UI: `/settings/members` & `/invitations/accept` (`apps/web`)**
   - `/settings/members`: loading/error/empty states, seat quota display (`PLAN_LIMITS.membersPerOrg`), RBAC-gated role dropdowns, remove/leave confirmation dialogs, invite dialog, and pending invitation resend/revoke actions.
   - `/invitations/accept`: open-redirect-safe `returnTo` handling across `/login` & `/register` (`ALLOWED_RETURN_TO_PREFIXES`), email verification guidance with resend/status re-check, wrong-account switch flow, clear expiry/revocation/invalid states, and atomic org join updating active workspace storage.
