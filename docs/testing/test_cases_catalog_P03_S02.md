# Test Cases Catalog — Phase 03 Sprint 02: OAuth Integration (Google + GitHub)

## 1. Metadata & Traceability

- **Sprint:** P03-S02: OAuth Integration — Google & GitHub
- **Phase:** Phase 03: Authentication & Multi-Tenancy
- **Feature Traceability:**
  - `FR-AUTH-07` (Google and GitHub OAuth sign-in with Authorization Code + PKCE + `state`)
  - `FR-AUTH-08` (Safe OAuth account linking: verified emails only)
  - `FR-AUTH-02` (unverified users cannot link accounts; extends SC-AUTH-019)
- **Scenario Traceability:**
  - `SC-AUTH-013` (First-time sign-in with a provider-verified email creates a verified user and a session)
  - `SC-AUTH-014` (Forged callback: wrong `state`, missing/tampered state cookie, wrong PKCE verifier, wrong provider)
  - `SC-AUTH-015` (Existing verified local account + verified provider email → safe link)
  - `SC-AUTH-016` (Unverified local or provider email → not linked, user told to sign in and link from settings)
  - `SC-AUTH-019` (extended: unverified user cannot start an account link)
  - `SC-AUTH-021` (post-login `returnTo` is allow-listed; open redirects are impossible) — **new**
  - `SC-AUTH-022` (provider denial, provider failure, and unconfigured provider end on the friendly error page without a session) — **new**
  - `SC-AUTH-023` (explicit link from settings: success, already linked elsewhere, session mismatch) — **new**
  - `SC-AUTH-024` (list and unlink linked accounts; last sign-in method is protected; other users' accounts are 404) — **new**
  - `SC-AUTH-025` (OAuth start/callback are rate limited per IP) — **new**
  - `SC-AUTH-026` (web: social buttons, OAuth error page, linked-accounts settings; WCAG 2.1 AA in light and dark) — **new**
- **Lead Personas:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewer Personas:** `role-security-engineer`, `role-sdet-architect`
- **Mocking policy:** no real OAuth calls anywhere. API integration tests intercept the providers' HTTP endpoints with MSW (`setupServer`); E2E tests mock the API's `/api/v1/...` responses with Playwright routing.

## 2. Test Data & Fixtures

| Fixture               | Value                                                                                                                                            |
| :-------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| Google profile        | `sub=g-1001`, `email=oauth.google@example.com`, `email_verified=true`, `name="Gina Google"`                                                      |
| GitHub profile        | `id=2002`, `login=hubert`, `/user/emails` → primary + verified `oauth.github@example.com`, plus a non-primary verified and an unverified address |
| Verified local user   | registered via `/auth/register`, then `emailVerifiedAt` set                                                                                      |
| Unverified local user | registered via `/auth/register`, left unverified                                                                                                 |
| Allowed `returnTo`    | `/runs`, `/runs?status=failed`, `/settings/profile`                                                                                              |
| Hostile `returnTo`    | `//evil.example`, `https://evil.example`, `/\evil.example`, `/runs@evil.example`, `javascript:alert(1)`, `/%2f%2fevil.example`, `/unknown`       |

## 3. Test Scenarios Register

### [SC-AUTH-013] First-Time Provider Sign-In Creates a Verified User

- **Given:** No user with the provider email exists; the provider (mocked) returns a verified email.
- **When:** `GET /auth/oauth/:provider/start` then `GET /auth/oauth/:provider/callback?code&state` with the state cookie from start.
- **Then:** 302 to `WEB_ORIGIN/runs`; a `User` exists with `emailVerifiedAt` set, `passwordHash = null`; one `OAuthAccount` row; `tp_access` and `tp_refresh` cookies are `HttpOnly`; the `Location` header and body contain no token; `GET /auth/me` with those cookies returns the user. Repeated for Google and GitHub.
- **Variants:** returning user (already linked) signs in again → same user id, no duplicate user or `OAuthAccount`; GitHub uses the verified **primary** address from `/user/emails`, never the profile `email` field.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/oauth.int.test.ts`

### [SC-AUTH-014] Forged or Replayed Callbacks Are Rejected

- **Given:** A callback request that does not match the flow started by this browser.
- **When:** the callback is called with (a) a `state` that differs from the cookie, (b) no state cookie, (c) a state cookie with a tampered signature, (d) an expired state cookie, (e) a cookie issued for the other provider, (f) a missing `code`.
- **Then:** 302 to `/oauth/error?code=INVALID_STATE`; no session cookies; no `User` or `OAuthAccount` created; the provider's token endpoint is never called. Separately, on a valid flow the token request carries the `code_verifier` whose S256 challenge was sent on the authorize URL (PKCE binding), and the state cookie is cleared (expired `Set-Cookie`) after use, even on failure.
- **Level:** Integration (`I`) + Unit (`U`) for the state-cookie signer
- **Automated By:** `apps/api/test/auth/oauth.int.test.ts`, `apps/api/test/auth/oauth-state.test.ts`

### [SC-AUTH-015] Safe Linking When Both Emails Are Verified

- **Given:** A local user with a verified email; the provider returns the same email as verified.
- **When:** the user signs in with the provider.
- **Then:** an `OAuthAccount` is attached to the **existing** user (no second user); the user is signed in; password login keeps working.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/oauth.int.test.ts`

### [SC-AUTH-016] Linking Refused for Unverified Emails

- **Given:** (a) a local user whose email is **unverified**, provider email verified; (b) a verified local user, but the provider asserts the email as **unverified** (Google `email_verified=false`; GitHub primary address not verified); (c) GitHub account with no verified primary email at all.
- **When:** the user signs in with the provider.
- **Then:** (a) → `/oauth/error?code=EMAIL_CONFLICT`; (b)/(c) → `/oauth/error?code=EMAIL_UNVERIFIED`; no `OAuthAccount` created, no session cookie set, the local account is unchanged (pre-hijacking prevented). The redirect URL never contains the email address.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/oauth.int.test.ts`

### [SC-AUTH-019] Unverified User Cannot Start an Account Link (extended)

- **Given:** An authenticated user whose email is unverified.
- **When:** `POST /me/oauth-accounts/github/link`.
- **Then:** 403 `EMAIL_NOT_VERIFIED`; no state cookie issued.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/oauth.int.test.ts` (OAuth link); the generic restricted-action guard stays in `apps/api/test/auth/register-verify.int.test.ts`

### [SC-AUTH-021] `returnTo` Allow-List Prevents Open Redirects

- **Given:** `GET /auth/oauth/:provider/start?returnTo=<value>` with allowed and hostile values (see fixtures).
- **When:** the flow completes.
- **Then:** allowed values are honored (path + query preserved); every hostile or unknown value falls back to `/runs`; the final redirect target always begins with `WEB_ORIGIN/` and never leaves that origin. Unit tests exercise `sanitizeReturnTo` exhaustively (including encoded slashes, backslashes, control characters, over-length input).
- **Level:** Unit (`U`) + Integration (`I`)
- **Automated By:** `packages/shared/src/api/oauth.test.ts`, `apps/api/test/auth/oauth.int.test.ts`

### [SC-AUTH-022] Provider Denial, Failure and Misconfiguration End Gracefully

- **Given:** (a) the user denies consent (`?error=access_denied`); (b) the provider's token endpoint returns `invalid_grant` or a 5xx; (c) the profile endpoint fails; (d) the provider has no client credentials configured; (e) the provider never answers (bounded by `OAUTH_PROVIDER_TIMEOUT_MS`).
- **When:** the callback (or start) is called.
- **Then:** (a) `ACCESS_DENIED`, (b)/(c) `PROVIDER_ERROR`, (d) `PROVIDER_NOT_CONFIGURED` on `/oauth/error` (for a settings-initiated link: `503 SERVICE_UNAVAILABLE`), (e) `PROVIDER_ERROR`; no session; no row created; no provider error text is echoed into the URL; an unknown `:provider` path segment is a 404.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/oauth.int.test.ts`

### [SC-AUTH-023] Explicit Account Link From Settings

- **Given:** A signed-in, verified user.
- **When:** `POST /me/oauth-accounts/:provider/link` returns an authorization URL; the user completes the provider flow.
- **Then:** an `OAuthAccount` is attached to the signed-in user (the provider email need not match); redirect to `/settings/profile?linked=<provider>`. Refusals: the provider account already belongs to a different user → `ACCOUNT_ALREADY_LINKED`; the session at callback time belongs to a different user than the one who started the link → `INVALID_STATE`; the request needs a valid `Origin` (CSRF, SC-AUTH-018 rules).
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/oauth.int.test.ts`

### [SC-AUTH-024] List and Unlink Linked Accounts

- **Given:** A user with 0..2 linked accounts, with and without a password.
- **When:** `GET /me/oauth-accounts` and `DELETE /me/oauth-accounts/:id`.
- **Then:** the list contains only the caller's accounts and exposes no `providerAccountId`; unlinking succeeds when the user keeps another sign-in method (password or another provider); unlinking the **last** sign-in method → 409 `CONFLICT` (message explains to set a password or link another account first); unlinking another user's account id → 404 (no disclosure); unauthenticated → 401.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/oauth.int.test.ts`

### [SC-AUTH-025] OAuth Endpoints Are Rate Limited

- **Given:** One IP calls `/auth/oauth/:provider/start` or `/callback` more than 30 times in a minute.
- **When:** the 31st request arrives.
- **Then:** 429 with the standard `RATE_LIMITED` envelope; requests below the limit are unaffected.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/oauth.int.test.ts`

### [SC-AUTH-026] Web: Social Buttons, Error Page and Linked Accounts (Accessibility)

- **Given:** The Next.js app with the API mocked at the network layer.
- **When:** visiting `/login`, `/register`, `/oauth/error?code=<each code>`, `/settings/profile`; clicking a social button with a mocked provider journey.
- **Then:** both social buttons render on `/login` and `/register` as links to `/api/v1/auth/oauth/<provider>/start`; every error code shows a friendly message and a way back to sign-in (unknown/forged codes show the generic message); the settings section shows loading, empty, populated and error states; mocked-provider journeys land on `/runs` (success) and on the error page (denied); 0 axe-core violations in light and dark themes.
- **Level:** End-to-End (`E`)
- **Automated By:** `apps/web/e2e/oauth.spec.ts`

## 4. Boundary & Negative Matrix

| Area             | Cases                                                                                                                                                       |
| :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state`          | missing, wrong, reused, correct-but-expired (> 10 min), correct-but-other-provider                                                                          |
| PKCE             | verifier in cookie matches challenge on authorize URL; token request carries `code_verifier`                                                                |
| Email            | provider-verified, provider-unverified, GitHub with no primary-verified address, mixed-case email (normalized), local soft-deleted user with the same email |
| Race             | two concurrent first-time callbacks for the same provider account (unique-constraint retry resolves to one user)                                            |
| Tenant isolation | `OAuthAccount` is a global identity table; ownership checks on list/unlink return 404 for other users' rows                                                 |
| Secrets          | no client secret, token or provider error text appears in redirects or response bodies                                                                      |

## 5. Out of Scope (deferred)

- Real provider calls in CI (policy: none). Manual verification steps are documented in `docs/ops/oauth-setup.md`.
- Account/session management pages beyond the linked-accounts section (P03-S03+).
