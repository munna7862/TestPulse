# Walkthrough: Phase 03 — Sprint 02: OAuth Integration (Google + GitHub)

## 1. Sprint Metadata
- **Sprint:** P03-S02: OAuth Integration — Google & GitHub
- **Phase:** Phase 03: Authentication & Multi-Tenancy
- **Branch:** `feat/P03-S02-oauth-integration`
- **Lead Personas:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewer Personas:** `role-security-engineer`, `role-sdet-architect`
- **Date:** 2026-10-02
- **Features:** FR-AUTH-07, FR-AUTH-08 (both now **Done**)
- **Scenarios:** SC-AUTH-013…016, SC-AUTH-019 (extended), SC-AUTH-021…026 (new)
- **Test catalog:** [`test_cases_catalog_P03_S02.md`](../testing/test_cases_catalog_P03_S02.md)

---

## 2. What Was Built

### 2.1 API (`apps/api/src/modules/auth/oauth/`)
| File | Responsibility |
| :--- | :--- |
| `providers.ts` | Authorization Code + **PKCE (S256)** clients for Google and GitHub on one generic `arctic` `OAuth2Client` (arctic's own `GitHub` helper has no PKCE). Profile loaders validate every provider payload with Zod (schemas in `@testpulse/shared`). Every outbound call is bounded by `OAUTH_PROVIDER_TIMEOUT_MS` because arctic issues a bare `fetch` with no timeout. |
| `state-cookie.ts` | The short-lived (10 min) `tp_oauth` cookie: `base64url(json).base64url(hmac)`; HMAC key derived with HKDF from `JWT_ACCESS_SECRET` under a dedicated label. Holds `state`, PKCE verifier, provider, allow-listed `returnTo`, and (link flow only) the initiating user id. `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth/oauth`. |
| `oauth.service.ts` | Account resolution (see §3) plus list / link / unlink. Uses the system client; touches only global identity tables (`User`, `OAuthAccount`, `Session`). |
| `oauth.routes.ts` | `GET /api/v1/auth/oauth/:provider/start`, `GET …/callback` (public, **30/min/IP** via `@fastify/rate-limit`); `GET /api/v1/me/oauth-accounts`, `POST …/:provider/link`, `DELETE …/:id` (authenticated, CSRF-checked). |

Supporting changes:
- `AuthService.issueSession()` extracted from `login()` so OAuth issues **identical** session families and cookies (ADR-005 §3).
- `auth-error-handler.ts` extracted from `auth.routes.ts` so both plugins map `AuthError` the same way.
- `env.ts`: `GOOGLE_*`, `GITHUB_*`, `OAUTH_REDIRECT_BASE_URL`, `OAUTH_PROVIDER_TIMEOUT_MS`, `OAUTH_RATE_LIMIT_PER_MINUTE` (all optional with defaults).
- `log-redaction.ts` + `app.ts`: request logs drop the query string of `/api/v1/auth/oauth/*` URLs so the one-time `code` and `state` never reach logs (verified by running the app with logging on).

### 2.2 Shared (`packages/shared/src/api/oauth.ts`)
Provider and error-code enums, query/params/response schemas, provider payload schemas, and the pure browser-safe `sanitizeReturnTo()` open-redirect guard (allow-list: `/runs…`, `/settings…`; everything else → `/runs`).

### 2.3 Web (`apps/web`)
- `SocialSignInButtons` on `/login` and `/register` (plain links to `/api/v1/auth/oauth/<provider>/start`).
- `/oauth/error?code=&provider=` friendly error page (server component; unknown/hostile query values degrade to a generic message and are never rendered).
- `/settings` → `/settings/profile` with a **Linked accounts** section (loading skeleton, empty text, populated list, error + retry, connect/disconnect, "just linked" notice).
- `authClient` gained `listOAuthAccounts`, `startOAuthLink`, `unlinkOAuthAccount` (responses validated with the shared schemas).

### 2.4 Docs
`docs/ops/oauth-setup.md` (provider setup, local/staging/production callback URLs, env vars, manual verification, troubleshooting), `docs/api/rest-api.md`, `docs/ops/environment.md`, `.env.example`, feature/scenario catalogs.

---

## 3. Security Decisions
1. **State + PKCE:** `state` and verifier live only in the signed cookie; the callback requires cookie and `state` to match (constant-time), the provider to match the path, and the cookie to be < 10 min old. The cookie is cleared on every callback, success or failure. The verifier is sent on the token request and its S256 challenge was on the authorize URL (asserted in tests).
2. **No tokens in URLs:** sessions are issued as cookies only; the redirect target is `WEB_ORIGIN` + an allow-listed path. Error redirects carry only an opaque code and provider — never the email or provider error text.
3. **Account resolution (ADR-005 §8):** linked provider account → sign in; otherwise a **provider-verified** email is mandatory; an existing local user is linked **only if its own email is verified** (else `EMAIL_CONFLICT`, preventing pre-hijacking); otherwise a new verified user is created. Soft-deleted users are never signed in or re-linked. Concurrent first-time callbacks race on unique constraints and re-resolve to one user.
4. **GitHub email:** the profile `email` field is never used; only the address that is both `primary` and `verified` from `/user/emails`.
5. **Link flow is bound to its initiator:** `POST /me/oauth-accounts/:provider/link` needs a verified email (SC-AUTH-019) and a same-origin request; at callback time the browser's live session must belong to the same user, otherwise `INVALID_STATE`. One provider account ↔ one user; one account per provider per user.
6. **Unlink guard:** the last remaining sign-in method cannot be removed (409 `CONFLICT`, serializable transaction); another user's account id is a 404.
7. **Availability:** per-IP rate limit; provider calls time out; unconfigured providers fail closed to a friendly page.

---

## 4. Verification (observed output, this branch)

| Gate | Result |
| :--- | :--- |
| `npm run lint` | 6/6 tasks, 0 errors/warnings |
| `npm run typecheck` | 6/6 tasks, 0 errors |
| `npm run test` | shared 43, ui 14, db 16, web 8, **api 120** (14 files) — all passing |
| `npm run build` | 3/3 tasks successful (`/oauth/error` and `/settings/profile` are dynamic routes) |
| `npm run test:e2e` | **33 passed** (22 new in `e2e/oauth.spec.ts`, axe-core 0 violations in light **and** dark on every new/changed page state) |
| `npm run check:traceability` | 43/43 automated scenarios verified against tests |
| `npx prettier --check` | clean |
| `npm run audit` (project gate) | passed — see limitation 1 |
| `npm run test:contract` | not run: no queue or real-time code changed and `REDIS_URL` is not set locally (runs in CI) |

New tests: `apps/api/test/auth/oauth.int.test.ts` (66 integration tests, MSW-mocked providers, real PostgreSQL), `oauth-state.test.ts` (8), `log-redaction.test.ts` (2), `packages/shared/src/api/oauth.test.ts` (30), `apps/web/src/lib/oauth.test.ts` (5), `apps/web/e2e/oauth.spec.ts` (22). **No real OAuth traffic anywhere**: MSW is configured with `onUnhandledRequest: "error"` in the API suite.

### Acceptance criteria
- [x] Google and GitHub sign-in create or sign in to a user account — SC-AUTH-013
- [x] Same-email accounts are linked only under the verified-email rule — SC-AUTH-015/016
- [x] The state/PKCE check rejects forged callbacks — SC-AUTH-014
- [x] OAuth errors display user-friendly messages — SC-AUTH-022/026
- [x] Social login buttons render on the auth pages — SC-AUTH-026

---

## 5. Changes Outside the Sprint Scope (flagged)
- **`apps/web/src/components/AppSidebar.tsx`:** the active nav item used `text-primary` on `bg-primary/10`, which is **2.62:1 in the dark theme** (fails WCAG AA). It only escaped notice because the existing dark-theme audit ran on `/dev/ui`, where no main nav item is active. Switched the active state to the existing accessible token `text-primary-link`. Required for the new Settings page to pass its dark-theme axe check.
- **`package-lock.json` / `apps/api/package.json`:** added `arctic@^3.7.0` (the version pinned by ADR-004) and `msw@^2` (dev; named in the sprint's testing plan).

## 6. Known Limitations & Follow-ups
1. **`npm audit --audit-level=high` is not clean, and was not before this sprint.** The same 4 high advisories exist on `HEAD` (Prisma CLI transitive `mysql2`, `deepmerge-ts`; dev-only). The project's `npm run audit` gate passes because they are covered by time-boxed exceptions (expire 2026-11-30). `arctic` and `msw` added **no** advisories (verified by auditing the `HEAD` lockfile).
2. **Auth rate limiting for password login (FR-AUTH-09 / SC-AUTH-017) is still not implemented.** `@fastify/rate-limit` was installed in P03-S01 but not registered; this sprint rate-limits only the OAuth routes. The P03-S01 catalog lists SC-AUTH-017 as automated while the master catalog shows `—`. Left for P03-S06 as planned; flagged here so it is not assumed done.
3. **In-memory rate-limit store.** Limits are per API instance. Fine for the free profile's single instance; move to the Redis store before running more than one instance.
4. **Settings-initiated link needs an email-verified user** and a provider that is configured; otherwise `403`/`503` with a message in the UI.
5. **The web E2E mocks the API and the provider at the network layer** (Playwright routing). The server-side flow is covered by the MSW integration suite against a real database. A real-provider smoke test is a manual step documented in `oauth-setup.md` §6.
6. **OAuth-only users** have no password. They can set one through "Forgot password" (works today); a dedicated "set password" settings screen is not part of this sprint.
7. **`/settings/*` has no auth guard on the web side yet** (the whole `(app)` shell is unauthenticated until the session-aware layout lands with org context in P03-S03); the API endpoints it calls are authenticated and return 401.
