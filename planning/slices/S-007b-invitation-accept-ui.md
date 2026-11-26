# S-007b: Web accept-invitation page & safe `returnTo` (P03-S04 part 3b/3)

Milestone: P03 Auth & Multi-Tenancy · Appetite: 1 session · Risk: medium (open-redirect guard on `returnTo`, StrictMode single-accept guard, multi-state auth/verify/error UX)
Replaces or covers: P03-S04 task 9 (`/invitations/accept`, completes `FR-ORG-07` & `SC-E2E-004`)

## Outcome
Invitees opening `/invitations/accept?token=...` are guided cleanly through sign-in or sign-up (preserving a safe allow-listed `returnTo`), email verification, wrong-account switching, clear expiry/revocation/invalid states, and atomic membership acceptance into their new organization, completing `P03-S04`.

## Acceptance criteria (EARS)
- AC1 When `/login` or `/register` receives `?returnTo=...` (`[SC-AUTH-021]`), the shared allow-list (`ALLOWED_RETURN_TO_PREFIXES` including `"/invitations/accept"`) and `sanitizeReturnTo` shall allow `/invitations/accept?token=...` while rejecting protocol-relative, backslash, control-char, or foreign-origin URLs back to `/runs`, and `/login` shall redirect post-login to that sanitized target and preserve it across Sign in ↔ Create account links.
- AC2 When a visitor opens `/invitations/accept` (`[SC-ORG-011]`, `[SC-ORG-012]`, `[SC-ORG-013]`, `[SC-E2E-004]`): without `?token=`, a manual token form shall submit cleanly; while signed out (`401`), sign-in and register links shall preserve `returnTo`; while unverified (`!emailVerifiedAt` or `EMAIL_NOT_VERIFIED`), the page shall offer `"Resend verification email"` and `"Check verification status"`; when signed in as the verified rightful invitee, the page shall submit `POST /api/v1/invitations/accept` once, persist `STORAGE_ORG_KEY` (`org.id`), and offer `"Open workspace"` → `/runs`.
- AC3 When `/api/v1/invitations/accept` returns `403 FORBIDDEN` (wrong email), `400 INVALID_TOKEN`, `400 INVITATION_EXPIRED`, `400 INVITATION_REVOKED`, `409 CONFLICT`, or `429 RATE_LIMITED`, the page shall render clear accessible recovery alerts (including `"Sign out to switch account"` on wrong email), render all untrusted organization names/emails strictly as text, and pass `@axe-core/playwright` with zero violations in both light and dark themes across states (`[SC-UX-004]`, `[SC-UX-005]`).

## Non-goals
- Auto-redirecting through OAuth `returnTo` query parameters in `SocialSignInButtons` (password `/login` + `/register` cover email/password invite acceptance in P03-S04).
- Real-time notifications/emails UI (deferred to P07-S02).

## Contracts touched (read only these sections)
- `packages/shared/src/api/oauth.ts` (`ALLOWED_RETURN_TO_PREFIXES` adding `"/invitations/accept"`).
- `docs/api/rest-api.md` §2 (`POST /api/v1/invitations/accept`).
- `apps/web/AGENTS.md` (no DB imports, light/dark axe, loading/empty/error states, unit tests for helpers).

## Risks to test explicitly
- Open redirect via `returnTo`: `/login?returnTo=//evil.example` and `https://evil.example` must always fall back to `/runs`.
- React StrictMode double-invoke on `/invitations/accept?token=...` must not send duplicate single-use `accept` calls.
- XSS / hostile organization names `<img src=x onerror=alert(1)>` rendered safely as text; light/dark axe across loading, manual, anon, unverified, wrong-email, error, and accepted states.

## Tests written first
- `apps/web/src/lib/invitation-accept.acceptance.test.ts` covers `buildInvitationAcceptPath`, `sanitizeReturnTo`, `formatInviteAcceptError`, and `createMembersClient().acceptInvitation` (`[SC-AUTH-021]`, `[SC-ORG-011]..[SC-ORG-013]`).
- `apps/web/e2e/invitation-accept.spec.ts` covers full browser E2E journeys and light/dark axe checks (`[SC-E2E-004]`, `[SC-ORG-011]..[SC-ORG-013]`, `[SC-AUTH-021]`, `[SC-UX-004]`, `[SC-UX-005]`).

## Done means
`npm run check:pr-size` `< 800` · `npm run verify` + `npm run test:e2e` pass · claims, security and test audits pass with zero unaddressed proved findings · PR merged with green CI on `main`.
