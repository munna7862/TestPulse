# S-007a: Web members & invitations settings page (P03-S04 part 3a/3)

Milestone: P03 Auth & Multi-Tenancy · Appetite: 1 session · Risk: medium (RBAC button gating from shared map, plan quota feedback, XSS rendering)
Replaces or covers: P03-S04 task 9 (`/settings/members`, member management + pending invitations UI; `/invitations/accept` lands in **S-007b**)

## Outcome
Organization members can inspect teammates and active seat usage at `/settings/members`; Admins and Owners can invite teammates, resend or revoke pending invitations, change non-Owner member roles, and remove non-Owner members; and non-Owner members can leave the organization.

## Acceptance criteria (EARS)
- AC1 When a member visits `/settings/members` (`[SC-ORG-014]`, `[SC-ORG-015]`, `[SC-ORG-016]`), the UI shall display loading skeletons, retryable error states, or an empty state when no organization is selected; when ready, it shall render the active organization's seat quota (`membersPerOrg` from `PLAN_LIMITS`) and member directory (name, email, role badge, `"You"` badge on the signed-in caller), computing all permissions strictly via `@testpulse/shared` `can(role, action)`.
- AC2 While the caller has `can(role, "member.invite")` (`OWNER`/`ADMIN`) (`[SC-ORG-010]`, `[SC-PLAN-002]`), `/settings/members` shall render an `"Invite member"` action/dialog and the active pending invitations list with `"Resend"` and `"Revoke"` actions; when live members plus active pending invites reach `membersPerOrg`, the UI shall display clear upgrade/waitlist guidance; submitting valid `{ email, role }` (`ADMIN | MEMBER | VIEWER`) creates an invitation and refreshes the list safely as text. Non-admins shall not see pending invitations or invite controls.
- AC3 When an Admin or Owner manages existing members (`[SC-ORG-014]`, `[SC-ORG-015]`), non-Owner other members shall allow role updates (`ADMIN | MEMBER | VIEWER` via `PATCH /api/v1/orgs/:orgId/members/:userId`) and confirmed removal (`DELETE /api/v1/orgs/:orgId/members/:userId`), while Owner rows and self-target controls remain disabled/hidden. Non-Owner callers (`can(role, "member.leave")`) shall be able to confirm `"Leave organization"`, clearing stored workspace selection and refreshing memberships.
- AC4 Every state on `/settings/members` (loading, error, empty, Admin/Owner, Member/Viewer) shall render untrusted names/emails safely as text and pass `@axe-core/playwright` with zero violations in light and dark themes (`[SC-UX-004]`, `[SC-UX-005]`).

## Non-goals
- `/invitations/accept` Web page and `returnTo` auth flow → **S-007b**.
- Ownership transfer UI or organization deletion/rename controls (not in P03-S04 scope).
- Real-time Socket.IO room eviction listener on downgrade/removal (deferred to P05-S01).

## Contracts touched (read only these sections)
- `docs/api/rest-api.md` §2 (`/orgs/:orgId/members*`, `/orgs/:orgId/invitations*`).
- `apps/web/AGENTS.md` (no DB imports, light/dark axe, loading/empty/error states, unit tests for new helpers).

## Risks to test explicitly
- Privilege & UI gating consistency: UI never exposes role/remove/invite controls when `can(role, ...)` is false, never allows granting or mutating `OWNER`, and hides pending invitations from `MEMBER`/`VIEWER`.
- XSS / hostile strings & accessibility: `<img src=x onerror=alert(1)>` in member/inviter/org names rendered as text; zero axe violations in light and dark themes.

## Tests written first
- `apps/web/src/lib/members.acceptance.test.ts` covers helper validation, RBAC gating via `@testpulse/shared`, member quota math, error mapping, and `MembersClient` (`[SC-ORG-010]`, `[SC-ORG-014]`, `[SC-ORG-015]`, `[SC-ORG-016]`, `[SC-PLAN-002]`).
- `apps/web/e2e/members-settings.spec.ts` covers full browser `/settings/members` journeys and light/dark axe checks (`[SC-ORG-010]`, `[SC-ORG-014]`, `[SC-ORG-015]`, `[SC-PLAN-002]`).

## Done means
`npm run check:pr-size` `< 800` · `npm run verify` + `npm run test:e2e` pass · claims, security and test audits pass with zero unaddressed proved findings · PR merged with green CI on `main`.
