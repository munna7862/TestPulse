# ADR-005: Authentication & Sessions (API-Owned)

## Status
Accepted (P01-S04, 2026-10). Implements master plan D-01. Details: [`docs/security/security-model.md`](../security/security-model.md).

## Context
The REST API, the Socket.IO gateway, and the workers all need one notion of identity. The web app runs on a different host than the API: cross-site in the free profile (`*.vercel.app` vs `*.onrender.com`), same-site in the paid profile. Tokens must never be readable by JavaScript, and OAuth must not enable account takeover.

## Decision
1. **The API owns auth.** No Auth.js, Clerk, or Passport. OAuth uses Authorization Code + PKCE + `state`, implemented with `arctic` or `@fastify/oauth2`.
2. **Passwords:** argon2id (`argon2` package), memory ≥ 19 MiB, iterations ≥ 2, parallelism 1; minimum length 10; maximum 256 (to bound hashing cost).
3. **Session = access JWT + opaque refresh token:**
   - `tp_access`: JWT (HS256, `JWT_ACCESS_SECRET`), 15 min. Claims: `sub`, `sid` (session ID), `iat`, `exp`. Roles are **not** in the token; they are resolved per request from `OrgMember`, so role changes take effect immediately.
   - `tp_refresh`: 32 random bytes, stored as `HMAC-SHA256(JWT_REFRESH_SECRET, token)` in `Session.refreshTokenHash`; 30 days, sliding; `Path=/api/v1/auth`.
   - Rotation on every refresh. Reuse of a rotated token → revoke the whole `familyId`.
4. **Cookies:** `HttpOnly; Secure; SameSite=Lax`, host-only on the origin that serves `/api`. In the free profile that is the web origin, through the Next.js rewrite. In the paid profile, the app either keeps the same-origin rewrite or calls `api.<domain>` directly with CORS credentials (decided in P10-S06; both are same-site).
5. **CSRF:** `SameSite=Lax`, plus an `Origin` header check against `WEB_ORIGIN` on all cookie-authenticated non-GET requests. API-key routes ignore cookies entirely.
6. **WebSocket:** single-use 60-second tickets (ADR-002); never tokens in URLs.
7. **Email verification is required** before accepting invitations, linking OAuth by email, or creating an org. Unverified users can only verify, resend, or log out.
8. **OAuth linking rule:** link automatically only when the provider asserts a verified email **and** the existing local account's email is verified. Otherwise refuse and instruct the user to sign in with the existing method, then link from Account › Security.
9. **Generic responses:** register, resend-verification, and forgot-password always return the same response with similar timing. Login failures always say "Invalid email or password".

## Consequences
- **Positive:** one identity model for REST, sockets, and jobs; tokens are never exposed to scripts; immediate effect of role changes and revocations; works in both deployment profiles.
- **Negative / trade-offs:** we own security-sensitive code (hashing, rotation, OAuth); there's an extra DB read per request for membership; a refresh is needed every 15 minutes.
- **Mitigation:** thorough integration tests (SC-AUTH-*); a security review in P03-S06 and P10-S04; a membership lookup cache of ≤ 30 s is **not** allowed for writes; reads may cache only if invalidated on membership changes.

## Alternatives considered
- **Auth.js in Next.js:** sessions would live in the web tier while the API, gateway, and workers need them too, which means splitting or duplicating auth.
- **Clerk / Auth0:** fast, but a paid dependency at scale (D-14) and an external identity store for core tenancy.
- **Long-lived JWTs in localStorage:** XSS-exfiltratable; rejected.
