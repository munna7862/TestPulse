# Test Scenario Catalog (Master)

> **Status:** Refined in P01-S05 (2026-10) against the PRD, API contracts, and security model. Every sprint extends it.
> **Purpose:** The single list of behaviors TestPulse must keep proving. Each scenario has a permanent `SC-*` ID that links to features (`FR-*`, see [feature catalog](../product/feature-catalog.md)), sprint test catalogs, and automated tests (master plan D-15).

## How to use this file

- **Sprint catalogs** (`docs/testing/test_cases_catalog_PXX_SYY.md`) reference these IDs and add sprint-specific detail such as data, edge values, and fixtures. A new scenario discovered in a sprint is added **here** first, with the next free number in its area.
- **Automated tests** put the ID in the test title: `it("[SC-ING-005] retried batch is idempotent", ...)`. The CI traceability check (P02-S05) fails if a scenario marked automated has no matching test.
- **"Automated by"** is filled in when the test exists, using the test file path (e.g. `apps/api/test/ingest/results.int.test.ts`). `—` means not yet automated.
- **Levels:** `U` unit · `I` integration (real PostgreSQL) · `C` contract (real Redis) · `CT` component (RTL + MSW) · `E` end-to-end (Playwright) · `P` performance (k6/bench) · `M` manual/review.
- IDs are never reused. Obsolete scenarios are struck through with a reason, not deleted.

---

## AUTH — Authentication & sessions

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-AUTH-001 | A new email registers with a valid password | 202 with a generic message; user is created unverified; a verification email is captured by the test mail transport | I | FR-AUTH-01 | apps/api/test/auth/register-verify.int.test.ts |
| SC-AUTH-002 | An already-registered email registers again | Same generic response and status as SC-AUTH-001 (no enumeration); no second account is created | I | FR-AUTH-01 | apps/api/test/auth/register-verify.int.test.ts |
| SC-AUTH-003 | Registration with a password under 10 characters or a malformed email | 400 `VALIDATION_ERROR` with field details; nothing is persisted | I | FR-AUTH-01 | apps/api/test/auth/register-verify.int.test.ts |
| SC-AUTH-004 | A valid verification token is submitted | `emailVerifiedAt` is set; the token is marked used | I | FR-AUTH-02 | apps/api/test/auth/register-verify.int.test.ts |
| SC-AUTH-005 | An expired, used, or tampered verification token is submitted | 400; user state unchanged | I | FR-AUTH-02 | apps/api/test/auth/register-verify.int.test.ts |
| SC-AUTH-006 | Login with correct credentials | Access and refresh cookies are `HttpOnly; Secure; SameSite=Lax`, host-only; `/auth/me` returns the user; no token in the response body | I | FR-AUTH-03 | apps/api/test/auth/login-session.int.test.ts |
| SC-AUTH-007 | Login with a wrong password, or with an unknown email | 401 with an identical message for both cases | I | FR-AUTH-03 | apps/api/test/auth/login-session.int.test.ts |
| SC-AUTH-008 | Refresh with a valid refresh cookie | New access and refresh cookies; the previous refresh token no longer works | I | FR-AUTH-04 | apps/api/test/auth/login-session.int.test.ts |
| SC-AUTH-009 | An already-rotated refresh token is reused | 401; the entire token family is revoked (the newest token also stops working) | I | FR-AUTH-04 | apps/api/test/auth/login-session.int.test.ts |
| SC-AUTH-010 | Logout, then logout-all from another session | The current session is revoked; logout-all revokes every session for the user | I | FR-AUTH-05 | apps/api/test/auth/login-session.int.test.ts |
| SC-AUTH-011 | Password reset requested for an unknown email | Same generic 202 as for a known email; no email is sent | I | FR-AUTH-06 | apps/api/test/auth/password-reset.int.test.ts |
| SC-AUTH-012 | Reset confirmed with a valid token; then the same token reused; then an expired token | Password changes and all sessions are revoked; reuse and expired tokens are rejected | I | FR-AUTH-06 | apps/api/test/auth/password-reset.int.test.ts |
| SC-AUTH-013 | First-time Google/GitHub sign-in with a provider-verified email (mocked provider) | User created with `emailVerifiedAt`; session cookies set; redirect URL contains no tokens | I | FR-AUTH-07 | apps/api/test/auth/oauth.int.test.ts |
| SC-AUTH-014 | OAuth callback with a mismatched `state` or missing PKCE verifier | Rejected; no session created | I | FR-AUTH-07 | apps/api/test/auth/oauth.int.test.ts, apps/api/test/auth/oauth-state.test.ts |
| SC-AUTH-015 | OAuth email matches an existing local account, and both emails are verified | Accounts are linked; the user is signed in | I | FR-AUTH-08 | apps/api/test/auth/oauth.int.test.ts |
| SC-AUTH-016 | OAuth email matches an existing account, but the local or provider email is unverified | Not linked; the user is told to sign in with the existing method and link from settings | I | FR-AUTH-08 | apps/api/test/auth/oauth.int.test.ts |
| SC-AUTH-017 | Repeated failed logins for one account from rotating IPs, and for one IP across accounts | 429 once either per-account or per-IP limit is exceeded | I | FR-AUTH-09 | apps/api/test/auth/auth-hardening-h1b.acceptance.test.ts, apps/api/test/rate-limit.contract.test.ts |
| SC-AUTH-018 | A cookie-authenticated POST arrives with a foreign `Origin` header | 403; no state change | I | FR-AUTH-10 | apps/api/test/auth/login-session.int.test.ts |
| SC-AUTH-019 | An unverified user tries to create an org, accept an invitation, or link an OAuth account | 403 with `EMAIL_NOT_VERIFIED` guidance; verify/resend/logout still work | I | FR-AUTH-02 | apps/api/test/auth/register-verify.int.test.ts, apps/api/test/auth/oauth.int.test.ts |
| SC-AUTH-020 | Web auth flow (sign up → verify email → login → access /runs → logout) | Authentication succeeds, cookies handled, and 0 axe-core accessibility violations | E | FR-AUTH-01, FR-AUTH-03 | apps/web/e2e/auth.spec.ts |
| SC-AUTH-021 | OAuth `returnTo` is hostile (`//evil`, `https://evil`, `/\evil`, encoded slashes) or outside the allow-list | The post-login redirect always stays on `WEB_ORIGIN` and falls back to `/runs`; allow-listed paths are honored | U, I | FR-AUTH-07 | packages/shared/src/api/oauth.test.ts, apps/api/test/auth/oauth.int.test.ts |
| SC-AUTH-022 | The user denies consent, the provider's token/profile endpoint fails or hangs, or the provider is not configured | Friendly error page with an opaque code; no session; no provider text in the URL; unknown provider → 404 | I | FR-AUTH-07 | apps/api/test/auth/oauth.int.test.ts |
| SC-AUTH-023 | A signed-in, verified user links a provider from settings (also: provider account owned by another user; session changed mid-flow) | Linked to the initiating user; `ACCOUNT_ALREADY_LINKED` / `INVALID_STATE` refusals change nothing | I | FR-AUTH-08 | apps/api/test/auth/oauth.int.test.ts |
| SC-AUTH-024 | A user lists and unlinks linked accounts (also: last sign-in method; another user's account id) | Own accounts only, no provider ids; unlink works when another method remains; last method → 409; foreign id → 404 | I | FR-AUTH-08 | apps/api/test/auth/oauth.int.test.ts |
| SC-AUTH-025 | One IP exceeds the OAuth start/callback limit | 429 `RATE_LIMITED`; other routes unaffected | I | FR-AUTH-07 | apps/api/test/auth/oauth.int.test.ts |
| SC-AUTH-026 | Web: social buttons on /login and /register, OAuth error page, linked accounts in profile settings (loading, empty, populated, error) | Buttons link to `/api/v1/auth/oauth/<provider>/start`; friendly messages for every code; mocked-provider journeys land on /runs or the error page; 0 axe violations in light and dark | E | FR-AUTH-07, FR-AUTH-08 | apps/web/e2e/oauth.spec.ts, apps/web/src/lib/oauth.test.ts |

## ORG — Organizations, projects, membership

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-ORG-001 | A verified user creates an organization | User is OWNER; `planTier = FREE` | I | FR-ORG-01 | apps/api/test/orgs/orgs.acceptance.test.ts |
| SC-ORG-002 | A user who belongs to two orgs lists organizations | Only their memberships are returned; switching changes the active org in the UI | I | FR-ORG-02 | apps/api/test/orgs/orgs.acceptance.test.ts (API; org switching in the UI lands in S-003) |
| SC-ORG-003 | An Admin updates the org name; a Member attempts the same | Admin succeeds; Member gets 403 | I | FR-ORG-03 | apps/api/test/orgs/orgs.acceptance.test.ts |
| SC-ORG-004 | The Owner deletes the org; an Admin attempts to delete | Owner: org becomes inaccessible immediately (404) and the purge job removes its data; Admin: 403 | I | FR-ORG-03 | apps/api/test/orgs/orgs.acceptance.test.ts (soft delete; purge job lands in S-002) |
| SC-ORG-005 | The Owner transfers ownership to an Admin | New Owner set; previous Owner becomes Admin; exactly one Owner exists | I | FR-ORG-04 | apps/api/test/orgs/orgs.acceptance.test.ts |
| SC-ORG-006 | Anyone tries to remove the Owner or change the Owner's role directly | Rejected (403/400); Owner unchanged | I | FR-ORG-04 | apps/api/test/orgs/orgs.acceptance.test.ts (transfer guards; member role and removal routes land in P03-S04) |
| SC-ORG-007 | An Admin creates a project; a Member attempts the same | Admin: project with default settings (SLA 14, flaky window 10, threshold 3); Member: 403 | I | FR-ORG-05 | — |
| SC-ORG-008 | A project slug is reused within one org, and in a different org | Same org: 409; different org: allowed | I | FR-ORG-05 | — |
| SC-ORG-009 | A user verifies their email without an invitation; another arrives via invitation | First user is guided to create an org and project; invited user lands in the inviting org | CT | FR-ORG-06 | — |
| SC-ORG-010 | An Admin invites an email address | Invitation stored with a hashed token; email sent; the pending invite counts toward the member limit | I | FR-ORG-07 | — |
| SC-ORG-011 | The invitee (same verified email) accepts | Joins with the invited role; the token can't be reused | I | FR-ORG-07 | — |
| SC-ORG-012 | A different or unverified user tries to accept the invitation | 403; the invitation stays valid for the right user | I | FR-ORG-07 | — |
| SC-ORG-013 | An expired or revoked invitation is accepted | Rejected with a clear code | I | FR-ORG-07 | — |
| SC-ORG-014 | An Admin changes a Member to Viewer; a Member tries to promote themself | Admin succeeds; self-promotion gets 403 | I | FR-ORG-08 | — |
| SC-ORG-015 | An Admin removes a member | The member immediately gets 404 on org resources and is evicted from sockets (see SC-RT-006) | I | FR-ORG-08 | — |
| SC-ORG-016 | The permission map is evaluated for every (role, action) pair in master plan §7 | Results match the matrix exactly | U | FR-ORG-09 | — |
| SC-ORG-017 | The shared plan limits are read and `checkLimit` is called below, at and above each limit | `PLAN_LIMITS` matches master plan §8 (`null` = unlimited); usage below the limit is allowed, at the limit blocked, unlimited quotas always allowed | U | FR-PLAN-01 | packages/shared/src/plans.acceptance.test.ts |

## KEY — API keys

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-KEY-001 | An Admin creates an API key | Response contains the `tp_live_…` plaintext once; the database holds only the hash and prefix | I | FR-KEY-01 | — |
| SC-KEY-002 | A Member or Viewer tries to create a key | 403 | I | FR-KEY-01 | — |
| SC-KEY-003 | Keys are listed | Name, prefix, creator, `lastUsedAt`, and status only; never the hash or plaintext | I | FR-KEY-02 | — |
| SC-KEY-004 | A key is revoked, then used | The next ingest request gets 401 immediately (no cache delay) | I | FR-KEY-02 | — |
| SC-KEY-005 | A valid key calls a non-ingest route (e.g. `GET /api/v1/orgs`) | 401 | I | FR-KEY-03 | — |
| SC-KEY-006 | Project A's key is used against Project B's run ID | 404; runs started with A's key always belong to A | I | FR-KEY-03 | — |
| SC-KEY-007 | A key exceeds its rate limit | 429 `RATE_LIMITED` with `Retry-After`; other keys are unaffected | I | FR-KEY-04 | — |

## ING — Ingestion

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-ING-001 | A run is started with a new `externalRunId` | 201 with `runId` and `runNumber = previous + 1`; `run:started` published once, after commit | I | FR-ING-01 | — |
| SC-ING-002 | Two start calls with the same `externalRunId` race | Exactly one run; both callers get the same `runId`; `runNumber` allocated once | I | FR-ING-01 | — |
| SC-ING-003 | Shards 1/2 and 2/2 start with the same `externalRunId` and send results | One run containing both shards' results | I | FR-ING-02 | — |
| SC-ING-004 | A valid batch of 1,000 results is sent | 200; counters updated; `run:progress` published with a lean payload (no stack traces) | I | FR-ING-03 | — |
| SC-ING-005 | The same batch is retried | No duplicate results; counters unchanged | I | FR-ING-03 | — |
| SC-ING-006 | A batch with one invalid item; a batch of 1,001 items; a body over 5 MB | 400 with per-index errors; 400; 413. Nothing is persisted in any case | I | FR-ING-03 | — |
| SC-ING-007 | All shards complete | Final status is FAILED if any result failed (FLAKY does not fail it); `run:completed` published; `flaky-analysis` job and `run.failed`/`run.recovered` domain event enqueued | I | FR-ING-04 | — |
| SC-ING-008 | Shard 1 of 2 completes; later, results arrive after full completion | Run stays RUNNING after the first; late results get 409 | I | FR-ING-02, FR-ING-04 | — |
| SC-ING-009 | The same test is reported as `tests\a.spec.ts` (Windows) and `tests/a.spec.ts` (Linux) | Same fingerprint, same TestCase | U | FR-ING-05 | — |
| SC-ING-010 | The same title runs in two Playwright projects (chromium, firefox) | Two distinct TestCases | U | FR-ING-05 | — |
| SC-ING-011 | Two shards insert the same brand-new test case concurrently | One TestCase; no error | I | FR-ING-05 | — |
| SC-ING-012 | A project has open, closed, and other-project quarantines | `GET /ingest/quarantined-tests` returns only the open ones for the key's project | I | FR-ING-06 | — |
| SC-ING-013 | A Free org starts its 501st run of the month | 429 `QUOTA_EXCEEDED`; batches for already-started runs are still accepted | I | FR-ING-07 | — |
| SC-ING-014 | A run has had no activity for 30 minutes | The reaper sets TIMED_OUT and publishes `run:completed` exactly once | I | FR-ING-08 | — |
| SC-ING-015 | A second shard starts with a different `shardTotal`; a start call reuses the `externalRunId` of a completed run | `409 SHARD_MISMATCH`; `409 RUN_COMPLETED` | I | FR-ING-02 | — |

## REP — Reporter

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-REP-001 | The example Playwright suite runs with the reporter against a local API | Results are queryable **before** the suite finishes; the run completes at the end | I | FR-REP-01 | — |
| SC-REP-002 | The example Vitest suite runs with the reporter | All results ingested; run completed | I | FR-REP-02 | — |
| SC-REP-003 | A test fails once and passes on retry | Stored as FLAKY with `retryCount = 1` | I | FR-REP-03 | — |
| SC-REP-004 | A Playwright suite runs as 2 shards with the same CI environment | One TestPulse run with all results | I | FR-REP-04 | — |
| SC-REP-005 | Environment fixtures for GitHub Actions, GitLab CI, Jenkins, CircleCI, and none | Correct branch, SHA, job URL, and a stable `externalRunId` for each | U | FR-REP-05 | — |
| SC-REP-006 | The API is unreachable, returns 500, 429, or 401 | The runner's exit code is identical to a run without the reporter; one warning is printed | I | FR-REP-06 | — |
| SC-REP-007 | The first API request takes 45 s (simulated cold start) | Reporter keeps buffering, then delivers all results; overhead stays within the final-flush timeout | I | FR-REP-06 | — |
| SC-REP-008 | `TESTPULSE_DISABLED=1`, or no API key is configured | Reporter no-ops with a single info message | U | FR-REP-06 | — |
| SC-REP-009 | A 100 KB error message containing ANSI codes and a `ghp_…` token | Truncated to the limits; ANSI stripped; token redacted when redaction is enabled | U | FR-REP-07 | — |
| SC-REP-010 | Playwright with `quarantineMode: "non-blocking"`: (a) all failures quarantined; (b) one quarantined + one new failure; (c) quarantine list endpoint unavailable | (a) runner reports passed, results still stored as FAILED; (b) runner fails; (c) fail-open to advisory, runner fails | I | FR-REP-08 | — |
| SC-REP-012 | Default (advisory) mode: a quarantined test fails | Runner exit code is failed exactly as without TestPulse | I | FR-REP-08 | — |
| SC-REP-011 | The packed tarball is installed in a clean project (ESM and CJS) | Imports resolve; no runtime dependency on `@testpulse/shared` | I | FR-REP-09 | — |

## QRY — Query APIs

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-QRY-001 | The run list is filtered by status, branch, and date range together | Correct subset, newest first | I | FR-QRY-01 | — |
| SC-QRY-002 | Paginating with a cursor while new runs are inserted | No duplicates or skipped items | I | FR-QRY-01 | — |
| SC-QRY-003 | Run results are listed, then one result's detail is fetched | List omits stack traces with failures first; detail includes the full stack trace | I | FR-QRY-02 | — |
| SC-QRY-004 | Test case history is requested with and without a branch filter | Last N (default 20, max 100), correctly filtered | I | FR-QRY-03 | — |
| SC-QRY-005 | Test cases are searched by partial title with flaky/quarantined/label filters | Correct matches, paginated | I | FR-QRY-04 | — |

## RT — Real-time

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-RT-001 | Connecting with a fresh ticket; then reusing the same ticket | Connected and joined to `user:{id}`; reuse is rejected | I | FR-RT-01 | — |
| SC-RT-002 | Connecting with no ticket or an expired ticket | `connect_error` unauthorized | I | FR-RT-01 | — |
| SC-RT-003 | A member joins their project's room | Ack `{ ok: true }`; receives `run:*` events for that project | I | FR-RT-02 | — |
| SC-RT-004 | A user joins a project room in another org | Ack `NOT_FOUND`; receives nothing | I | FR-RT-02 | — |
| SC-RT-005 | Two gateway instances and the emitter; one client on each | Each client receives exactly one copy of every event | C | FR-RT-03 | — |
| SC-RT-006 | A connected member is removed from the org | Evicted from the org's project rooms; no further events | I | FR-RT-04 | — |
| SC-RT-007 | The network drops mid-run and reconnects | Rooms re-joined; queries refetched; final counters match the database | E | FR-RT-05 | — |
| SC-RT-008 | The same `eventId` is delivered twice | Applied once | U | FR-RT-05 | — |
| SC-RT-009 | The socket is unavailable for 15 s | Polling every 5 s plus degraded-mode banner; polling stops on reconnect | CT | FR-RT-06 | — |

## DASH — Dashboard UI

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-DASH-001 | A live run streams 10,000 results | List is virtualized; no main-thread task over 200 ms | P | FR-DASH-01 | — |
| SC-DASH-002 | A failed result is expanded | Details load on demand, render as text (ANSI stripped), and copy to the clipboard | CT | FR-DASH-01 | — |
| SC-DASH-003 | Run list filters are set, then the page is reloaded or the URL shared | Filters are restored from the URL | E | FR-DASH-02 | — |
| SC-DASH-004 | A new run starts while the run list is open | It appears at the top; running cards update counters live | E | FR-DASH-02 | — |
| SC-DASH-005 | A test case detail page is opened | Timeline, latest error, duration trend, and breadcrumbs render | E | FR-DASH-03 | — |
| SC-DASH-006 | The API is cold-starting (slow or 503 on the first call) | "Waking up the server…" state, then data; never an error page | CT | FR-DASH-04 | — |
| SC-DASH-007 | The project dashboard is opened with seeded data | Pass rate, quarantine health, and flakiest-test cards show correct values | E | FR-DASH-05 | — |

## FLK — Flaky detection (pure algorithm unless noted)

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-FLK-001 | A test has one FLAKY (retry-pass) result | State becomes SUSPECTED | U | FR-FLK-01 | — |
| SC-FLK-002 | Two retry flakes within the window | State becomes FLAKY | U | FR-FLK-01 | — |
| SC-FLK-003 | The same `commitSha` produced PASSED in one run and FAILED in another | State becomes FLAKY | U | FR-FLK-02 | — |
| SC-FLK-004 | Alternating P/F over 10 runs on the default branch | FLAKY (≥ 5 transitions) | U | FR-FLK-03 | — |
| SC-FLK-005 | Consistent regression: P,P,P,F,F,F,F | Stays STABLE (not flaky) | U | FR-FLK-03 | — |
| SC-FLK-006 | One-time fix: F,F,F,P,P,P | Stays STABLE | U | FR-FLK-03 | — |
| SC-FLK-007 | Fewer than 5 samples, or noisy results only on untracked feature branches | No state change | U | FR-FLK-03 | — |
| SC-FLK-008 | A FLAKY test then has 20 consecutive clean passes on tracked branches | Returns to STABLE | U | FR-FLK-04 | — |
| SC-FLK-009 | Analysis changes a test's state; a later analysis leaves it unchanged | First: `testcase:flaky-changed` + `test.flaky_detected` once; second: no events | I | FR-FLK-05 | — |
| SC-FLK-010 | The flaky-tests endpoint is called for a project | Sorted by score; only that project's tests | I | FR-FLK-05 | — |
| SC-FLK-011 | An Admin changes thresholds or tracked branches; a Member tries to | Admin: next analysis uses the new settings; Member: 403 | I | FR-FLK-06 | — |

## QUA — Quarantine

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-QUA-001 | A Member quarantines a test with a reason and assignee | ACTIVE; `slaDueAt = now + slaDays`; `isQuarantined = true`; `quarantine:changed` published | I | FR-QUA-01 | — |
| SC-QUA-002 | A Viewer quarantines a test in their org; anyone targets another org's test | 403; 404 | I | FR-QUA-01 | — |
| SC-QUA-003 | Two concurrent quarantine requests for the same test | One 201, one 409; a single open record | I | FR-QUA-01 | — |
| SC-QUA-004 | Every valid transition in master plan §5 / Phase 06 | Succeeds and appends a `QuarantineTransition` with actor and timestamp | U | FR-QUA-02 | — |
| SC-QUA-005 | Invalid transitions (closed → INVESTIGATING, resolve without a note, dismiss without a reason) | Rejected with a specific error code; no change | U | FR-QUA-02 | — |
| SC-QUA-006 | A test is re-quarantined after a RESOLVED record | A new record is created; the old one is untouched | I | FR-QUA-02 | — |
| SC-QUA-007 | The quarantine dashboard is filtered by status, assignee, overdue, and escalated | Correct rows; filters persisted in the URL; timeline shows transitions and comments | E | FR-QUA-03 | — |
| SC-QUA-008 | A bulk resolve of 10 items, 2 of which are invalid | 8 succeed; 2 reported as failed with reasons; the UI shows which | I | FR-QUA-04 | — |
| SC-QUA-009 | Fake clock passes 80%, 100%, and 200% of the SLA | `warnedAt` / `escalatedAt` / `overdueFlaggedAt` set, and each matching domain event enqueued exactly once | I | FR-QUA-05 | — |
| SC-QUA-010 | The SLA job is retried or runs concurrently | No duplicate markers or events | I | FR-QUA-05 | — |
| SC-QUA-011 | The process sleeps across both the 80% and 100% thresholds (free-tier catch-up) | On wake, both markers are set in order, once each | I | FR-QUA-05, FR-OPS-03 | — |
| SC-QUA-012 | MTTR is calculated over resolved, dismissed, and no records | Uses RESOLVED only; dismissed reported separately; no data → null (not 0) | U | FR-QUA-06 | — |
| SC-QUA-013 | A run has 1 new failure and 2 failures of quarantined tests | Run status FAILED; `quarantinedFailedCount = 2`; UI shows "1 new, 2 known (quarantined)"; GitHub summary lists new failures first | I | FR-QUA-08 | — |

## ANN — Annotations

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-ANN-001 | A Member comments; a Viewer tries to | Member: stored and `annotation:created` published; Viewer: 403 | I | FR-ANN-01 | — |
| SC-ANN-002 | A user edits/deletes their own comment and tries to delete someone else's; an Admin deletes any | Own: allowed; other's: 403; Admin: allowed | I | FR-ANN-01 | — |
| SC-ANN-003 | A comment @mentions an org member | `annotation.mentioned` domain event enqueued for that user | I | FR-ANN-03 | — |
| SC-ANN-004 | A comment @mentions a username that exists only in another org | Ignored: no event, and no hint that the user exists | I | FR-ANN-03 | — |
| SC-ANN-005 | A label is added, then removed, from a test case | The test case list can filter by the label while it is applied | I | FR-ANN-04 | — |
| SC-ANN-006 | User A comments while User B views the same test; then A's create fails server-side | B sees it without a refresh; A's optimistic item rolls back with an error | E | FR-ANN-05 | — |

## NOT — Notifications

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-NOT-001 | Each domain event type is routed with default preferences | Recipients match the default routing table; nobody outside the org is notified | I | FR-NOT-01 | — |
| SC-NOT-002 | The router job is retried for the same event | No duplicate notifications | I | FR-NOT-01 | — |
| SC-NOT-003 | A notification arrives while the user is online | Bell count updates live; mark-read (single and all) works; click-through opens the linked page | E | FR-NOT-02 | — |
| SC-NOT-004 | Email sending fails transiently, then succeeds | Retried; exactly one email delivered | I | FR-NOT-03 | — |
| SC-NOT-005 | A user clicks a category's unsubscribe link | That category stops; security emails (verify, reset, invite) still send | I | FR-NOT-04 | — |
| SC-NOT-006 | A user turns email off for an event type; another member has no preferences | First: in-app only; second: project defaults apply | I | FR-NOT-05 | — |
| SC-NOT-007 | 20 `run.failed` events in an hour, plus one SLA escalation | One digest email for the failures; the escalation email is sent immediately | I | FR-NOT-06 | — |

## GH — GitHub CI reporting

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-GH-001 | The reporter runs with `GITHUB_ACTIONS=true` | `$GITHUB_STEP_SUMMARY` contains counts, top failures, flaky/quarantined counts, and a dashboard link from the summary endpoint | I | FR-GH-01, FR-ING-10 | — |
| SC-GH-002 | The PR comment option is on and the workflow runs twice | The same comment is updated (marker), not duplicated; long suites are truncated | I | FR-GH-02 | — |
| SC-GH-003 | The check-run option is on with 120 failures | Check run created; annotations sent in batches of 50 | I | FR-GH-03 | — |
| SC-GH-004 | Fork PR (read-only token), or GitHub returns 403 / rate limit | Summary only, plus a warning; exit code unchanged | I | FR-GH-04 | — |

## WH — Webhooks

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-WH-001 | An Admin creates a webhook; a Member tries to | Admin: secret shown once and stored encrypted; Member: 403 | I | FR-WH-01 | — |
| SC-WH-002 | A subscribed event and an unsubscribed event occur | Only the subscribed event is delivered; its signature verifies with the documented algorithm | I | FR-WH-02 | — |
| SC-WH-003 | The endpoint returns 500 repeatedly | Retries with backoff up to 5 attempts; after 20 consecutive failures the webhook is disabled and admins are notified | I | FR-WH-03 | — |
| SC-WH-004 | A delivery is inspected, redelivered, and a test event is sent | The log shows each attempt with status and latency; redeliver and test event succeed | I | FR-WH-03 | — |

## ANL — Analytics

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-ANL-001 | A seeded dataset including empty days is aggregated | Pre-computed metrics equal raw-data calculations | I | FR-ANL-01 | — |
| SC-ANL-002 | Backfill runs twice; incremental rows are deliberately corrupted, then reconciliation runs | Same rows after both backfills; reconciliation fixes the drift | I | FR-ANL-01 | — |
| SC-ANL-003 | Trend charts are opened with range and branch filters in both themes | Correct data; a data-table alternative exists; no axe violations | E | FR-ANL-02 | — |
| SC-ANL-004 | Leaderboards are computed with tied values | Correct ranking with deterministic tie-breaks | I | FR-ANL-03 | — |
| SC-ANL-005 | MTTR trend and branch comparison are computed for a known dataset | Values match hand-calculated expectations | I | FR-ANL-04 | — |
| SC-ANL-006 | An export is requested within the cap, above the cap, and for another tenant | Streamed file; rejection with guidance; 404 | I | FR-ANL-05 | — |

## PLAN — Plan limits & retention

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-PLAN-001 | A Free org creates its 3rd project | 403 `PLAN_LIMIT_REACHED`; the UI shows the upgrade (contact/waitlist) modal | I | FR-PLAN-01 | — |
| SC-PLAN-002 | A Free org with 2 members and 1 pending invite sends another invite | 403 `PLAN_LIMIT_REACHED` | I | FR-PLAN-01 | — |
| SC-PLAN-003 | The usage endpoint is called before and after the quota is exceeded | Correct used/limit values; the over-quota banner shows | I | FR-PLAN-02, FR-ING-07 | — |
| SC-PLAN-004 | A Free project has `retentionDays = 30` | Effective retention is 7 days; only older raw data is deleted, in chunks; daily aggregates are kept | I | FR-PLAN-03 | — |

## SEC — Cross-cutting security

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-SEC-001 | Table-driven: every route is called by a user from another org | 404 for each | I | FR-SEC-01 | apps/api/test/orgs/tenant-context.acceptance.test.ts (org routes) |
| SC-SEC-002 | Table-driven: every route is called with each role below its minimum | 403 for each | I | FR-SEC-01, FR-ORG-09 | apps/api/test/orgs/tenant-context.acceptance.test.ts (org routes) |
| SC-SEC-003 | A route is registered without an entry in the isolation table | The meta-test fails | U | FR-SEC-01 | apps/api/test/orgs/tenant-context.acceptance.test.ts |
| SC-SEC-004 | The tenant client runs `findUnique` on a tenant model, a create with a foreign `projectId`, and `findMany` without a filter | Throws; throws; the scope is injected | U | FR-SEC-02 | packages/db/test/tenant-client.int.test.ts |
| SC-SEC-005 | API and web responses are inspected; a request comes from a foreign origin | Expected security headers present; CORS rejects the foreign origin | I | FR-SEC-03 | — |
| SC-SEC-006 | Login, refresh, and ingest requests are logged | Logs contain no passwords, tokens, cookies, or API keys | I | FR-SEC-04 | — |
| SC-SEC-007 | Role change, key create/revoke, project delete, and ownership transfer occur | One `AuditEvent` each, with actor and target | I | FR-SEC-04 | — |
| SC-SEC-008 | `<script>`, `javascript:` links, and ANSI escapes appear in test titles, stack traces, and comments | Rendered inert in every view | CT | FR-SEC-05, FR-ANN-02 | — |
| SC-SEC-009 | Webhook URLs targeting 127.0.0.1, 10.0.0.0/8, 169.254.169.254, `[::1]`, a DNS-rebinding host, or a redirect to a private IP | All blocked | I | FR-WH-04 | — |
| SC-SEC-010 | A CSV export contains a cell beginning with `=`, `+`, `-`, or `@` | The cell is prefixed with `'` | U | FR-QUA-07, FR-ANL-05 | — |
| SC-SEC-011 | A dependency with a high-severity advisory or a committed secret is introduced | CI fails (`npm audit --audit-level=high`, gitleaks) | M | FR-SEC-06 | — |

## UX — Design system, states, accessibility

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-UX-001 | The component catalog is rendered in both themes | Every primitive appears; no axe critical/serious violations; visual snapshots match | E | FR-UX-01 | apps/web/e2e/catalog.spec.ts |
| SC-UX-002 | The page loads with a dark system preference | The first paint uses dark tokens (no flash) | E | FR-UX-02 | apps/web/e2e/catalog.spec.ts |
| SC-UX-003 | The user picks a theme, reloads, then logs in on another device | Choice persists locally and (from P09-S02) across devices | E | FR-UX-02 | apps/web/e2e/catalog.spec.ts |
| SC-UX-004 | Each key screen is forced into loading, empty, error, read-only (Viewer), and plan-limit states | Each state renders as designed in P01-S02 | CT | FR-UX-03 | packages/ui/src/index.test.ts |
| SC-UX-005 | Every page is scanned with axe-core in both themes | 0 critical/serious violations | E | FR-UX-04 | apps/web/e2e/catalog.spec.ts |
| SC-UX-006 | The quarantine workflow and live run view are used keyboard-only and with a screen reader | Completable; focus visible; live-region announcements are throttled and meaningful | M | FR-UX-04 | — |
| SC-UX-007 | `prefers-reduced-motion: reduce` is set | Non-essential animations are disabled | E | FR-UX-05 | — |

## OPS — Operations & deployment

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-OPS-001 | `/health` is called with everything up, then with the database down | 200 with DB and Redis status; then 503. The worker heartbeat is recorded | I | FR-OPS-01 | apps/api/test/health-db.int.test.ts |
| SC-OPS-002 | Free-profile staging: login through the web origin's `/api` proxy, then a token refresh | Cookies are first-party on the web origin, and refresh works | E | FR-OPS-02 | apps/web/e2e/smoke.spec.ts |
| SC-OPS-003 | The API starts with `RUN_WORKERS_IN_PROCESS=true`, then with `false` | Jobs are processed in-process; with `false`, no workers start | I | FR-OPS-02 | apps/api/test/ci-pipeline.test.ts |
| SC-OPS-004 | Redis is flushed (non-persistent free tier) and the API restarts | Repeatable jobs are re-registered exactly once | C | FR-OPS-03 | apps/api/test/queues.contract.test.ts |
| SC-OPS-005 | The scenario catalog marks a scenario automated with no matching `[SC-*]` test title | The traceability check fails CI | U | FR-OPS-04 | apps/api/test/ci-pipeline.test.ts |
| SC-OPS-006 | Paid profile: restore drill and alert test | Database restores to a branch; downtime, error, queue, and worker alerts fire | M | FR-OPS-05 | — |
| SC-OPS-007 | PR is opened or push to main occurs | GitHub Actions CI workflow triggers verify and e2e jobs with service containers | I | FR-OPS-04 | apps/api/test/ci-pipeline.test.ts |
| SC-OPS-008 | Commit merges to main | Staging deployment workflow runs Prisma migrations and triggers Render deployment | M | FR-OPS-04 | apps/api/test/ci-pipeline.test.ts |

## PERF — Non-functional (master plan §10)

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-PERF-001 | 10,000 results are ingested as 10 × 1,000 batches (local/CI infrastructure) | Persisted in under 5 s | P | FR-ING-09 | — |
| SC-PERF-002 | 100 clients (P05-S06), then 1,000 per instance (P10-S03), receive `run:progress` | p95 publish-to-receive latency under 200 ms | P | FR-RT-07 | — |
| SC-PERF-003 | 1,000 concurrent WebSocket connections are held on one gateway instance for 10 minutes | Stable memory and CPU; no disconnect storms | P | FR-RT-07 | — |
| SC-PERF-004 | 1,000 concurrent requests hit read endpoints | p95 under 300 ms | P | NFR §10 | — |
| SC-PERF-005 | The dashboard initial load is measured (p75) | LCP under 2.0 s | P | NFR §10 | — |

## E2E — Critical journeys

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-E2E-001 | **Golden path:** sign up → verify → create org and project → create API key → run the example Playwright suite with the reporter | Results appear live on the dashboard while the suite runs; the whole path takes ≤ 10 minutes for a new user | E | FR-ORG-06, FR-REP-01, FR-GTM-02 | — |
| SC-E2E-002 | **Live collaboration:** two browsers (two members) watch the same run | Both show identical live state with no duplicate rows | E | FR-DASH-01, FR-RT-03 | — |
| SC-E2E-003 | **Triage lifecycle:** test detected flaky → quarantined → assigned → commented (seen live by the other user) → SLA warning (fake clock) → resolved | Every step visible to both users; notification received; audit trail complete | E | FR-FLK-05, FR-QUA-01, FR-QUA-02, FR-ANN-05, FR-NOT-02 | — |
| SC-E2E-004 | **Invitation:** an Admin invites → the invitee signs up and verifies → accepts | Invitee sees the org's projects with the invited role, and nothing more | E | FR-ORG-07 | — |
| SC-E2E-005 | **Notification delivery:** @mention and SLA escalation | In-app notifications plus emails (test transport), according to preferences | E | FR-NOT-02, FR-NOT-03 | — |

## GTM — Public site & docs

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-GTM-001 | Lighthouse runs on the landing page (mobile and desktop) | Performance, Accessibility, and SEO ≥ 95; LCP under 1.5 s | P | FR-GTM-01 | — |
| SC-GTM-002 | A first-time user follows the quickstart (timed) | First live run within 10 minutes | M | FR-GTM-02 | — |
| SC-GTM-003 | Documentation snippets and examples run in CI; the OpenAPI spec is compared with registered routes | All snippets pass; no undocumented or stale routes | I | FR-GTM-03 | — |
| SC-GTM-004 | Public and app pages are crawled; analytics payloads are inspected | Unique meta on public pages; app pages `noindex`; analytics events contain no PII | I | FR-GTM-04 | — |

## DEV — Developer tooling & quality gates

| ID | Given / When | Then | Level | FR | Automated by |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SC-DEV-001 | ESLint flat config runs across all workspaces (`npm run lint`) | 0 errors and 0 warnings with type-aware rules enabled | U | FR-DEV-01 | apps/api/test/dev-tooling.test.ts |
| SC-DEV-002 | Code attempts forbidden imports (web importing db, shared importing server code or node built-ins, prisma imported outside packages/db, cross-package relative paths) | ESLint boundary rules reject the imports with explicit architectural guidance | U | FR-DEV-01 | apps/api/test/dev-tooling.test.ts |
| SC-DEV-003 | Prettier check (`npm run format:check`) runs across the repository | All matched files adhere to formatting rules without ESLint conflicts | U | FR-DEV-01 | apps/api/test/dev-tooling.test.ts |
| SC-DEV-004 | TypeScript compiler runs typecheck across all workspaces (`npm run typecheck`) | 0 compiler errors under strict, noUncheckedIndexedAccess, and noImplicitOverride | U | FR-DEV-01 | apps/api/test/dev-tooling.test.ts |
| SC-DEV-005 | Git commit is created with Husky pre-commit and commit-msg hooks | `lint-staged` auto-fixes staged files and `commitlint` validates conventional commit formats and monorepo scopes | U | FR-DEV-01 | apps/api/test/dev-tooling.test.ts |
| SC-DEV-006 | Developer opens monorepo in VS Code | Workspace settings and extension recommendations configure auto-formatting on save and recommended tooling | M | FR-DEV-01 | — |

