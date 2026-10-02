# Test Cases Catalog — Phase 03 Sprint 01: User Registration, Email Verification & Password Authentication

## 1. Metadata & Traceability
- **Sprint:** P03-S01: User Registration, Email Verification & Password Authentication
- **Phase:** Phase 03: Authentication & Multi-Tenancy
- **Feature Traceability:**
  - `FR-AUTH-01` (Email/password registration with generic responses)
  - `FR-AUTH-02` (Email verification with single-use, expiring tokens; unverified users restricted)
  - `FR-AUTH-03` (Login with first-party HttpOnly cookie session)
  - `FR-AUTH-04` (Refresh-token rotation with reuse detection & family revocation)
  - `FR-AUTH-05` (Logout current session and logout everywhere)
  - `FR-AUTH-06` (Password reset request and confirm, revoking sessions)
  - `FR-AUTH-09` (Auth rate limiting per IP and per account)
  - `FR-AUTH-10` (CSRF protection for cookie-authenticated mutations via Origin check)
- **Scenario Traceability:**
  - `SC-AUTH-001` (New email registers with valid password → 202 generic, unverified user, test mail sent)
  - `SC-AUTH-002` (Duplicate email registers → identical generic 202, no second account created)
  - `SC-AUTH-003` (Password < 10 chars or malformed email → 400 VALIDATION_ERROR)
  - `SC-AUTH-004` (Valid verification token submitted → emailVerifiedAt set, token marked used)
  - `SC-AUTH-005` (Expired, used, or tampered verification token → 400 error)
  - `SC-AUTH-006` (Login with valid credentials → HttpOnly Secure Lax cookies set, /auth/me returns user)
  - `SC-AUTH-007` (Login with wrong password or unknown email → identical 401 response)
  - `SC-AUTH-008` (Refresh with valid refresh cookie → token rotated, previous token invalidated)
  - `SC-AUTH-009` (Already-rotated refresh token reused → 401, entire token family revoked)
  - `SC-AUTH-010` (Logout current session; logout-all revokes all sessions)
  - `SC-AUTH-011` (Password reset requested → generic 202 for known/unknown emails, reset mail sent for existing)
  - `SC-AUTH-012` (Reset confirmed with token → password changed, sessions revoked, reuse rejected)
  - `SC-AUTH-017` (Repeated failed logins trigger 429 rate limit)
  - `SC-AUTH-018` (Cookie-authenticated mutation with foreign Origin rejected with 403)
  - `SC-AUTH-019` (Unverified user restricted from org creation or restricted actions)
  - `SC-AUTH-020` (End-to-end auth journey: sign up → verify email → login → access app shell → logout; WCAG 2.1 AA)
- **Lead Personas:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewer Personas:** `role-security-engineer`, `role-sdet-architect`

---

## 2. Test Scenarios Register

### [SC-AUTH-001] User Registration with Valid Password
- **Given:** A new, unregistered email and a valid password (≥10 chars).
- **When:** `POST /api/v1/auth/register` is called.
- **Then:** API returns 202 Accepted with a generic message; user is created with `emailVerifiedAt = null`; verification email with 24-hour token is sent via the Mailer.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/register-verify.int.test.ts`

### [SC-AUTH-002] Duplicate Registration Without Enumeration
- **Given:** An existing registered email address.
- **When:** `POST /api/v1/auth/register` is called with the same email.
- **Then:** Returns identical 202 Accepted and generic response as `SC-AUTH-001`; no duplicate account is created; no sensitive details are disclosed.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/register-verify.int.test.ts`

### [SC-AUTH-003] Registration Input Validation Rejections
- **Given:** Password < 10 characters or malformed email address.
- **When:** `POST /api/v1/auth/register` is called.
- **Then:** 400 `VALIDATION_ERROR` with detailed field paths; no user is created.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/register-verify.int.test.ts`

### [SC-AUTH-004] Email Verification with Valid Token
- **Given:** An unverified user and a valid, unexpired single-use verification token.
- **When:** `POST /api/v1/auth/verify-email` is called with the token.
- **Then:** `User.emailVerifiedAt` is populated with current timestamp; `VerificationToken.usedAt` is marked; 200 OK returned.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/register-verify.int.test.ts`

### [SC-AUTH-005] Rejection of Expired, Used, or Tampered Tokens
- **Given:** A verification token that has expired (>24h), already been used, or modified.
- **When:** `POST /api/v1/auth/verify-email` is called.
- **Then:** 400 Bad Request error; user verification status remains unchanged.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/register-verify.int.test.ts`

### [SC-AUTH-006] Successful Login & Cookie Session Issuance
- **Given:** A registered user with valid email and password.
- **When:** `POST /api/v1/auth/login` is called.
- **Then:** Returns 200 OK; sets `tp_access` (15 min) and `tp_refresh` (30 days) cookies with `HttpOnly; Secure; SameSite=Lax`; no tokens in response body; subsequent `GET /api/v1/auth/me` with cookies succeeds.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/login-session.int.test.ts`

### [SC-AUTH-007] Failed Login Non-Enumeration
- **Given:** Wrong password for an existing email, or an unknown email address.
- **When:** `POST /api/v1/auth/login` is called.
- **Then:** Returns identical 401 Unauthorized (`"Invalid email or password"`) for both cases.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/login-session.int.test.ts`

### [SC-AUTH-008] Refresh Token Rotation
- **Given:** An active session with a valid `tp_refresh` cookie.
- **When:** `POST /api/v1/auth/refresh` is called.
- **Then:** A new access token and new rotated refresh token are issued; old session is marked revoked with `replacedById`; old refresh token is no longer valid.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/login-session.int.test.ts`

### [SC-AUTH-009] Refresh Token Reuse Detection & Family Revocation
- **Given:** An already-rotated `tp_refresh` token.
- **When:** Reused in `POST /api/v1/auth/refresh`.
- **Then:** 401 Unauthorized; the entire session family (`familyId`) is immediately revoked; subsequent requests with any token from that family fail.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/login-session.int.test.ts`

### [SC-AUTH-010] Logout and Logout-All
- **Given:** An authenticated user session.
- **When:** `POST /api/v1/auth/logout` or `POST /api/v1/auth/logout-all` is called.
- **Then:** Session is marked `revokedAt`; cookies are cleared; session is immediately rejected on next request.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/login-session.int.test.ts`

### [SC-AUTH-011] Password Reset Request Generic Response
- **Given:** A valid email (registered or unregistered).
- **When:** `POST /api/v1/auth/password/forgot` is called.
- **Then:** Returns generic 202 Accepted response; if user exists, a 30-minute single-use reset token is created and sent via email.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/password-reset.int.test.ts`

### [SC-AUTH-012] Password Reset Confirmation & Session Invalidation
- **Given:** A valid reset token and a new password (≥10 chars).
- **When:** `POST /api/v1/auth/password/reset` is called.
- **Then:** Password hash is updated; reset token is marked used; all existing active sessions for that user are revoked; token reuse is rejected.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/password-reset.int.test.ts`

### [SC-AUTH-017] Rate Limiting on Authentication Endpoints
- **Given:** High frequency of failed login requests from an IP or targeting an account.
- **When:** Limit threshold is exceeded.
- **Then:** Returns 429 Too Many Requests with standard error envelope.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/login-session.int.test.ts`

### [SC-AUTH-018] CSRF Protection via Origin Header Check
- **Given:** Cookie-authenticated mutating request (`POST /api/v1/auth/logout`, etc.).
- **When:** Request contains a foreign or disallowed `Origin` header.
- **Then:** Request is rejected with 403 Forbidden without mutating server state.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/login-session.int.test.ts`

### [SC-AUTH-019] Unverified User Action Guard
- **Given:** An authenticated user whose email is not yet verified (`emailVerifiedAt = null`).
- **When:** User attempts restricted actions (such as org creation or invite acceptance).
- **Then:** API rejects with 403 Forbidden and `EMAIL_NOT_VERIFIED` code; verify, resend, and logout remain accessible.
- **Level:** Integration (`I`)
- **Automated By:** `apps/api/test/auth/register-verify.int.test.ts`

### [SC-AUTH-020] Full E2E Web Authentication Journey & Accessibility
- **Given:** The Next.js web application running with auth routes.
- **When:** User navigates to `/register`, submits details, verifies email, logs in via `/login`, views `/runs` app shell, and logs out.
- **Then:** Flow succeeds smoothly; cookies are handled correctly; `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` pass axe-core accessibility audit with 0 violations.
- **Level:** End-to-End (`E`)
- **Automated By:** `apps/web/e2e/auth.spec.ts`
