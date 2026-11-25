# S-006: Invitations schema, API endpoints & Mailer (P03-S04 part 2/3)

Milestone: P03 Auth & Multi-Tenancy · Appetite: 1 session · Risk: medium (member quota locks, token rotation/reuse races, cross-tenant lookups)
Replaces or covers: P03-S04 tasks 1–4 (`FR-ORG-07`)

## Outcome
Organization Admins and Owners can invite teammates by email (within `membersPerOrg` plan limits), list active pending invitations, resend (rotating the token and extending the 7-day expiry), and revoke invitations; invited users with a matching verified email can atomically accept a single-use invitation link to join the organization.

## Acceptance criteria (EARS)
- AC1 When an Admin or Owner calls `POST /api/v1/orgs/:orgId/invitations` with `{ email, role }` (`ADMIN | MEMBER | VIEWER`) (`[SC-ORG-010]`, `[SC-PLAN-001]`), the API shall lock the `Organization` row (`FOR UPDATE`), count live members plus active pending invites against `membersPerOrg` (`403 PLAN_LIMIT_REACHED` with `details: { limit, current }`), reject already-member or active pending-invite emails with `409 CONFLICT`, store a 7-day `Invitation` with lowercase `email` and SHA-256 `tokenHash` (never returning `token` or `tokenHash`), send an invitation email via `Mailer`, and enqueue post-commit `"member.invited"` on `"domain-events"`.
- AC2 When an Admin or Owner manages pending invitations (`[SC-ORG-010]`), `GET /api/v1/orgs/:orgId/invitations` shall return active pending invitations (`acceptedAt IS NULL AND revokedAt IS NULL AND expiresAt > now`) without `tokenHash`; `POST /api/v1/orgs/:orgId/invitations/:id/resend` shall rotate `tokenHash`, extend `expiresAt` by 7 days, invalidate the previous token, and email the new token (rejecting accepted, revoked, or expired invites with `409`); `DELETE /api/v1/orgs/:orgId/invitations/:id` shall set `revokedAt` (`204`, immediately freeing the member quota slot; rejecting accepted with `409` and missing/already-revoked/malformed with `404`).
- AC3 When an authenticated, verified user calls `POST /api/v1/invitations/accept` with a valid token whose email matches the user's verified email case-insensitively (`[SC-ORG-011]`), the API shall atomically mark `acceptedAt`, create the `OrgMember` row with `invitation.role`, and return `200` `OrgResponseSchema` (`role = invitation.role`); concurrent accepts with the same token shall succeed once (`200`) and fail the rest (`409`).
- AC4 While a caller is unverified or signed in with a different verified email (`[SC-ORG-012]`, `[SC-AUTH-019]`), `POST /api/v1/invitations/accept` shall return `403 EMAIL_NOT_VERIFIED` or `403 FORBIDDEN` respectively and leave `acceptedAt` `null` so the rightful invitee can still accept.
- AC5 If an unknown/malformed token, expired invitation, revoked invitation, already-accepted invitation, or invitation for a soft-deleted organization is submitted to `POST /api/v1/invitations/accept` (`[SC-ORG-013]`), then the API shall return `400 INVALID_TOKEN`, `400 INVITATION_EXPIRED`, `400 INVITATION_REVOKED`, `409 CONFLICT`, or `400 INVALID_TOKEN` respectively, and reject missing/foreign `Origin` requests with `403` CSRF failure.

## Non-goals
- Web members/invitations settings UI and `/invitations/accept` Web page (next slice: **S-007**).
- Production email delivery transport / notification email templates (**P07-S02**).

## Contracts touched (read only these sections)
- `planning/master/TestPulse_Master_Plan.md` §5 (`Invitation`), §6.2 (`domain-events`: `member.invited`), §7 (`member.invite`), §8 (`membersPerOrg`).
- `docs/api/rest-api.md` §1 (`Error codes`: added `INVITATION_EXPIRED`, `INVITATION_REVOKED`) & §2.
- `packages/db/prisma/schema.prisma`, `packages/shared/src/api/invitations.ts`, `packages/shared/src/api/envelope.ts`.

## Risks to test explicitly
- Isolation & auth: `404` for outsiders/malformed `:orgId`/`:id` on org invitation routes, `403` for Member/Viewer on `member.invite`, `403 EMAIL_NOT_VERIFIED` / `403 FORBIDDEN` on wrong/unverified invitee, CSRF on `POST /invitations/accept`, rate limiting on `POST /invitations/accept`.
- Races: concurrent `POST /invitations` under `Organization` `FOR UPDATE` row lock hitting `membersPerOrg` limit; concurrent `POST /invitations/accept` single-use atomicity (`Promise.all`); `resend` + `accept` race invalidating old token.
- Outage resilience: mailer failure (`onMailError`) and queue failure (`onEnqueueError`) never fail `201`/`200`.

## Tests written first
- `apps/api/test/invitations/invitations.acceptance.test.ts` covers AC1–AC5 (`[SC-ORG-010]`, `[SC-ORG-011]`, `[SC-ORG-012]`, `[SC-ORG-013]`, `[SC-AUTH-019]`, `[SC-PLAN-001]`, `[SC-SEC-001]`, `[SC-SEC-002]`).

## Done means
Required checks green · claims, security and test audits pass with zero unaddressed proved findings · PR merged with green CI on `main`.
