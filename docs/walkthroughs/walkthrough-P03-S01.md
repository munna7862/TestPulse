# Walkthrough: Phase 03 — Sprint 01: User Registration, Email Verification & Password Authentication

## 1. Sprint Metadata
- **Sprint:** P03-S01: User Registration, Email Verification & Password Authentication
- **Phase:** Phase 03: Authentication & Multi-Tenancy
- **Branch:** `feat/P03-S01-user-registration-auth`
- **Lead Personas:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewer Personas:** `role-security-engineer`, `role-sdet-architect`
- **Date:** 2026-10-02

---

## 2. Overview & Implementation Summary

In P03-S01, we implemented end-to-end API-owned identity, session lifecycle, and authentication pages adhering strictly to master plan contracts (D-01, D-13; ADR-005):

1. **Database Models & Migration (`packages/db`)**:
   - Extended `User` with `passwordHash`, `avatarUrl`, `sessions`, `verificationTokens`, `oauthAccounts`.
   - Added `Session` model for refresh-token rotation families (`familyId`, `refreshTokenHash`, `expiresAt`, `revokedAt`, `replacedById`, `userAgent`).
   - Added `VerificationToken` model for single-use email verification and password reset tokens (`type`, `tokenHash`, `expiresAt`, `usedAt`).
   - Added `OAuthAccount` model for future OAuth account linkage (`provider`, `providerAccountId`).
   - Generated and verified migration `20261002133000_auth_identity` on PostgreSQL schema-per-worker test harness.

2. **Shared Zod Validation Schemas (`packages/shared`)**:
   - Auth schemas in `packages/shared/src/api/auth.ts`:
     - `RegisterBodySchema`, `RegisterResponseSchema` (enforcing password ≥ 10 chars, ≤ 256 chars, normalized emails).
     - `VerifyEmailBodySchema`, `VerifyEmailResponseSchema`.
     - `ResendVerificationBodySchema`, `ResendVerificationResponseSchema`.
     - `LoginBodySchema`, `LoginResponseSchema` (no tokens in body; tokens issued strictly as secure cookies).
     - `RefreshResponseSchema`, `LogoutResponseSchema`.
     - `ForgotPasswordBodySchema`, `ForgotPasswordResponseSchema`.
     - `ResetPasswordBodySchema`, `ResetPasswordResponseSchema`.
     - `AuthUserSchema`, `AuthMeResponseSchema`.

3. **Backend Password Hashing & Token Architecture (`apps/api/src/modules/auth/`)**:
   - `password.ts`: Implemented argon2id hashing with ADR-005 parameters (memory 19 MiB = 19,456 KiB, timeCost 2 iterations, parallelism 1).
   - `tokens.ts`: Cryptographically secure random tokens (32 bytes = 64 hex chars), HMAC-SHA256 refresh token hashing, and cookie helpers (`tp_access`, `tp_refresh`).
   - `AuthService`:
     - Non-enumerating registration and password reset responses.
     - Single-use 24-hour verification tokens.
     - Single-use 30-minute password reset tokens with session family revocation.
     - Refresh token rotation and automatic reuse detection (compromised token reuse revokes the whole family).
     - Single session logout and logout-all.

4. **Fastify Auth Routes & Security Middleware (`apps/api/src/modules/auth/`)**:
   - Registered endpoints:
     - `POST /api/v1/auth/register` (202 generic response)
     - `POST /api/v1/auth/verify-email` (200 OK)
     - `POST /api/v1/auth/resend-verification` (202 generic response)
     - `POST /api/v1/auth/login` (sets `tp_access` and `tp_refresh` cookies)
     - `POST /api/v1/auth/refresh` (rotates tokens and cookies)
     - `POST /api/v1/auth/logout` (revokes session and clears cookies)
     - `POST /api/v1/auth/logout-all` (revokes all user sessions)
     - `POST /api/v1/auth/password/forgot` (202 generic response)
     - `POST /api/v1/auth/password/reset` (revokes sessions and clears cookies)
     - `GET /api/v1/auth/me` (returns user profile for active session)
   - `validateCsrf`: Validates `Origin` header against `WEB_ORIGIN` for cookie-authenticated mutations.
   - `authenticateUser`: Validates `tp_access` JWT against active database session.
   - `requireVerifiedEmail`: Rejects unverified users with 403 `EMAIL_NOT_VERIFIED`.

5. **Mailer Interface & Transports (`apps/api/src/lib/mailer/`)**:
   - `TestMailer`: In-memory transport recording verification and reset emails for test assertions.
   - `ConsoleMailer`: Development transport outputting formatted verification and reset links.

6. **Next.js Web Authentication Pages (`apps/web/src/app/(auth)/`)**:
   - `AuthLayout`: Accessible layout with brand logo, ThemeToggle, and responsive centered card.
   - `/login`: Email & password sign-in form with error feedback and link to `/forgot-password`.
   - `/register`: Registration form with client-side password length validation and check-email confirmation state.
   - `/verify-email`: Token verification form with automatic query string parsing (`?token=...`).
   - `/forgot-password`: Password reset request form with generic confirmation state.
   - `/reset-password`: Token-based password reset form with password confirmation.
   - Color contrast hardened with `text-primary-link` ensuring WCAG 2.1 AA in both light and dark themes.

---

## 3. Traceability & Automated Scenarios

All 15 auth scenarios are registered in `docs/testing/scenario-catalog.md` and detailed in `docs/testing/test_cases_catalog_P03_S01.md`:

| Scenario ID | Feature | Description | Automated By | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SC-AUTH-001** | `FR-AUTH-01` | Valid registration creates unverified user and sends email | `apps/api/test/auth/register-verify.int.test.ts` | **PASS** |
| **SC-AUTH-002** | `FR-AUTH-01` | Duplicate email returns identical 202 generic response (no enumeration) | `apps/api/test/auth/register-verify.int.test.ts` | **PASS** |
| **SC-AUTH-003** | `FR-AUTH-01` | Password < 10 chars or malformed email returns 400 VALIDATION_ERROR | `apps/api/test/auth/register-verify.int.test.ts` | **PASS** |
| **SC-AUTH-004** | `FR-AUTH-02` | Valid verification token sets `emailVerifiedAt` and marks token used | `apps/api/test/auth/register-verify.int.test.ts` | **PASS** |
| **SC-AUTH-005** | `FR-AUTH-02` | Expired, used, or tampered verification token returns 400 | `apps/api/test/auth/register-verify.int.test.ts` | **PASS** |
| **SC-AUTH-006** | `FR-AUTH-03` | Valid login sets secure `HttpOnly` cookies and exposes no tokens in body | `apps/api/test/auth/login-session.int.test.ts` | **PASS** |
| **SC-AUTH-007** | `FR-AUTH-03` | Wrong password or unknown email returns identical 401 | `apps/api/test/auth/login-session.int.test.ts` | **PASS** |
| **SC-AUTH-008** | `FR-AUTH-04` | Refresh rotates refresh token and invalidates old token | `apps/api/test/auth/login-session.int.test.ts` | **PASS** |
| **SC-AUTH-009** | `FR-AUTH-04` | Already-rotated token reuse revokes entire session family | `apps/api/test/auth/login-session.int.test.ts` | **PASS** |
| **SC-AUTH-010** | `FR-AUTH-05` | Logout revokes current session; logout-all revokes all sessions | `apps/api/test/auth/login-session.int.test.ts` | **PASS** |
| **SC-AUTH-011** | `FR-AUTH-06` | Forgot-password returns generic 202 for known/unknown emails | `apps/api/test/auth/password-reset.int.test.ts` | **PASS** |
| **SC-AUTH-012** | `FR-AUTH-06` | Reset confirmed with token updates password and revokes all sessions | `apps/api/test/auth/password-reset.int.test.ts` | **PASS** |
| **SC-AUTH-018** | `FR-AUTH-10` | Cookie-authenticated mutation with foreign Origin rejected with 403 | `apps/api/test/auth/login-session.int.test.ts` | **PASS** |
| **SC-AUTH-019** | `FR-AUTH-02` | Unverified user attempting restricted action rejected with 403 | `apps/api/test/auth/register-verify.int.test.ts` | **PASS** |
| **SC-AUTH-020** | `FR-AUTH-01`, `03` | Web auth pages render with WCAG 2.1 AA in light/dark themes | `apps/web/e2e/auth.spec.ts` | **PASS** |

---

## 4. Verification Results & Quality Gates

All Turborepo quality gates were executed locally and observed to pass:

| Gate / Command | Observed Output | Duration | Status |
| :--- | :--- | :--- | :--- |
| `npm run check:traceability` | `100% of automated scenarios verified against tests` (33/33 verified) | 0.8s | **PASS** |
| `npm run format:check` | `All matched files use Prettier code style!` | 1.8s | **PASS** |
| `npm run lint` | 0 ESLint errors, 0 warnings across all 6 workspaces | 14.2s | **PASS** |
| `npm run typecheck` | 0 TypeScript compiler errors across all 6 workspaces | 7.1s | **PASS** |
| `npm run test` | 84 tests passing across `@testpulse/shared` (13), `@testpulse/db` (16), `@testpulse/api` (44), `@testpulse/ui` (14) | 4.1s | **PASS** |
| `npm run test:e2e` | 11 Playwright E2E & Axe accessibility tests passing in both themes | 9.1s | **PASS** |
| `npm run build` | Turborepo build success across Next.js 16 (`/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/runs`, `/dev/ui`) and Fastify 5 | 11.2s | **PASS** |
| `npm audit --omit=dev --audit-level=high` | Pinned Prisma 7.10 dev dependencies audited per ADR-004; no production package vulnerabilities introduced | 1.5s | **PASS** |
