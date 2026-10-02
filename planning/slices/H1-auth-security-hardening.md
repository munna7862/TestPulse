# H1: Auth Security & Rate Limiting Hardening

Milestone: M0 Security & Integrity · Appetite: 1 session · Risk: high (auth, security)

## Outcome
After this ships, password authentication routes are protected against brute-force and credential stuffing (G4), account enumeration is blocked via constant-time dummy password hashing (G5), and concurrent refresh token exchange is atomic with session family revocation on reuse (G6).

## Acceptance criteria (EARS)

### AC1 · Rate Limiting (G4 / SC-AUTH-017)
- **AC1.1 (Login):** When an IP or email exceeds the rate limit threshold (10 req/min per IP, 5 req/15 min per email), the API shall reject subsequent login requests with HTTP 429 Too Many Requests and a `retry-after` header.
- **AC1.2 (Register / Resend / Forgot Password):** When an IP or email exceeds the password recovery / registration rate limit (20 req/hour per IP, 5 req/hour per email), the API shall reject with HTTP 429.

### AC2 · Timing Parity & Anti-Enumeration (G5 / Threat Model T11 / ADR-005 §9)
- **AC2.1 (Dummy Hash on Unknown Email):** When a login request is made for an email not present in the database (or deleted/passwordless), the auth service shall execute an argon2id hash verification against a constant dummy hash (`verifyPassword(DUMMY_PASSWORD_HASH, password)`) so execution time matches an invalid password for an existing account.
- **AC2.2 (Uniform Response Contract):** Unknown emails and incorrect passwords shall return the exact same 401 error envelope (`INVALID_CREDENTIALS`, "Invalid email or password.") with indistinguishable timing profiles.

### AC3 · Atomic Refresh Token Rotation & Concurrency Guard (G6 / SC-AUTH-009)
- **AC3.1 (Atomic Concurrency):** When two or more concurrent requests attempt to rotate the exact same refresh token using `Promise.all`, the API shall ensure at most one request succeeds in minting a replacement session.
- **AC3.2 (Family Revocation on Race/Reuse):** Any concurrent request that fails to rotate the token due to an already-consumed or replaced session shall detect token reuse, revoke the entire session family, and return HTTP 401 (`TOKEN_REUSE_DETECTED`).

## Non-goals
- Modifying OAuth flows (already hardened in P03-S02).
- Adding CAPTCHA or external SMS 2FA.

## Risks & Edge Cases
- Rate limit key generation must handle requests with or without bodies gracefully.
- Prisma interactive transactions in PostgreSQL must use conditional atomic updates (`updateMany` with `revokedAt: null, replacedById: null`) to prevent dirty reads across concurrent connections.
- Argon2id dummy hash must use identical memory/time parameters as genuine hashes (19 MiB, 2 iterations, parallelism 1).

## Cited Contracts
- `planning/master/TestPulse_Master_Plan.md` §7 (Security & Isolation)
- `docs/security/security-model.md` §5 (Rate Limiting Baseline)
- `docs/security/threat-model.md` (T11 Information Disclosure)
- `docs/architecture/adr-005-auth-and-session-design.md` §9
- `docs/testing/scenario-catalog.md` (`SC-AUTH-009`, `SC-AUTH-017`)
