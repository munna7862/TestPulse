# Phase 03 — Sprint 01: User Registration, Email Verification & Password Authentication

## Sprint Objective

Implement API-owned registration, email verification, login, cookie-based session management with refresh-token rotation, and password reset (master plan D-01, D-13).

## Dependencies

Phase 02 complete (monorepo, database, API scaffolding).

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Extend the `User` model and add `Session` (refresh-token family) and `VerificationToken` models per master plan §5.
2. Hash passwords with argon2id; enforce a minimum length of 10.
3. `POST /api/v1/auth/register`: Zod-validated; gives a generic response (no account enumeration) and sends a verification email.
4. `POST /api/v1/auth/verify-email` with a hashed, single-use, 24-hour token.
5. `POST /api/v1/auth/login`: sets the access JWT (15 min) and refresh token (30 days) as `HttpOnly; Secure; SameSite=Lax` host-only cookies, which must work through the same-origin `/api` proxy (free profile, master plan §4.4).
6. `POST /api/v1/auth/refresh`: rotates the refresh token, and reuse of a rotated token revokes the whole family.
7. `POST /api/v1/auth/logout` (current session) and `POST /api/v1/auth/logout-all`.
8. `GET /api/v1/auth/me`.
9. Password reset request and confirm: hashed, single-use, 30-minute tokens. All sessions are revoked on reset.
10. Implement the `authenticateUser` preHandler, plus an Origin-header CSRF check for cookie-authenticated mutations.
11. Implement the `Mailer` interface (console/file transport in dev and test; Resend or SMTP in staging/production) with plain verification and reset templates.
12. Rate-limit register, login, and reset per IP and per account.
13. Web: sign-up, login, verify-email, forgot-password, and reset-password pages built from the P02-S06 primitives.

## Expected Files / Areas

`packages/db/prisma/schema.prisma`, `apps/api/src/modules/auth/`, `apps/api/src/lib/mailer/`, `apps/web/src/app/(auth)/`

## Testing & Verification

Unit tests for hashing, token generation, and rotation logic. Integration tests for register, verify, login, refresh (including reuse detection), logout, and reset. E2E sign-up → verify (via the test mail transport) → login.

## Acceptance Criteria

- [ ] Users can register, and must verify their email to unlock invitation acceptance and OAuth linking.
- [ ] Login sets secure cookies; no tokens are exposed to JavaScript or URLs.
- [ ] Refresh rotates the token, and reuse of an old refresh token revokes the session family.
- [ ] Logout invalidates the session.
- [ ] Password reset works end to end and revokes existing sessions.
- [ ] Auth responses do not reveal whether an email is registered.
- [ ] Protected routes reject unauthenticated requests with 401.

## Risks / Guardrails

Weak password policy; JWT secret in source code; refresh token reuse; account enumeration via response or timing differences; cross-site cookie misconfiguration between app and api domains.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03 — Sprint 01: User Registration, Email Verification & Password Authentication.
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/03-phase-authentication-multi-tenancy.md
4. planning/sprints/P03-S01-user-registration-authentication.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P03_S01.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P03-S01.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] New or changed screens have loading, empty and error states and pass the axe-core check in light and dark themes.
- [ ] Acceptance criteria verified.
- [ ] Feature catalog status and scenario catalog "Automated by" entries updated; tests carry `[SC-*]` IDs in their titles.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
