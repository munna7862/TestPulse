# S-008b: Web API keys settings UI, show-once dialog & reporter snippet (P03-S05 part 2/2)

Milestone: P03 Auth & Multi-Tenancy · Appetite: 1 session · Risk: medium (show-once secret exposure, RBAC UI gating, XSS in untrusted key/creator names, clipboard fallback)
Replaces or covers: P03-S05 task 8 (`FR-KEY-01`..`FR-KEY-03`)

## Outcome
Organization Admins and Owners can open `/settings/api-keys` to inspect project API keys (prefix, creator, status badges `ACTIVE`/`EXPIRED`/`REVOKED`, timestamps without hashes/plaintext), generate a new key with optional expiry via a show-once dialog with copy button and ready-to-paste `@testpulse/reporter` snippets (Playwright / Vitest referencing `TESTPULSE_API_KEY`), and immediately revoke compromised keys; Members and Viewers see clear permission-gated guidance instead of secret controls.

## Acceptance criteria (EARS)
- AC1 When a workspace Admin or Owner navigates to `/settings/api-keys` (`[SC-KEY-001]`, `[SC-KEY-003]`, `[SC-UX-004]`), the page shall appear in Settings navigation, show loading skeletons while fetching, render empty state when none exist or error state with Retry on failure, and list keys with `name`, `tp_live_<prefix>…`, `createdByName`, `lastUsedAt`, `expiresAt`, and `ACTIVE`/`EXPIRED`/`REVOKED` badges without ever exposing hashes or plaintext.
- AC2 When an Admin or Owner submits the Generate API key form with `{ name, expiryPreset }` (`[SC-KEY-001]`), the dialog shall validate non-empty trimmed name, call `POST /api/v1/projects/:projectId/api-keys`, transition into a single-view reveal state displaying `plaintextKey` once, a copy button with visual feedback, an explicit show-once warning, and tabbed Playwright / Vitest `@testpulse/reporter` configuration snippets referencing `process.env.TESTPULSE_API_KEY`.
- AC3 While the signed-in caller lacks `apiKey.manage` (Member or Viewer) (`[SC-KEY-002]`) or an Admin revokes a key (`[SC-KEY-004]`), non-Admins shall see a read-only/restricted notice with no Create or Revoke actions, Admins shall confirm revocation in a confirmation dialog calling `DELETE /api/v1/projects/:projectId/api-keys/:keyId`, hostile key/creator strings shall render safely as React text, and all states shall pass `@axe-core/playwright` in light and dark themes (`[SC-UX-005]`).

## Non-goals
- Ingestion run/result dashboards (**P04/P05**).
- Key rotation automation or per-scope granular API keys (**non-MVP**).

## Contracts touched (read only these sections)
- `planning/master/TestPulse_Master_Plan.md` §7 (`apiKey.manage` RBAC matrix) & §5 (`ApiKey`).
- `packages/shared/src/api/api-keys.ts`, `packages/shared/src/permissions.ts` (`can(role, "apiKey.manage")`).
- `docs/api/rest-api.md` §2 (`GET/POST /projects/:projectId/api-keys`, `DELETE .../api-keys/:keyId`).

## Risks to test explicitly
- Secret handling: `plaintextKey` lives only in ephemeral dialog component state cleared on close; `@testpulse/reporter` config snippets reference `process.env.TESTPULSE_API_KEY` rather than embedding secrets.
- Workspace switching & stale reads: `AbortController` / latest-project scoping prevents stale keys from leaking when switching organizations or projects.
- Security & a11y: zero `@testpulse/db` imports in `apps/web`, hostile `<img src=x onerror=...>` key/creator names rendered strictly as text, 0 axe violations across states in light and dark modes.

## Tests written first
- `apps/web/src/lib/api-keys.acceptance.test.ts` and `apps/web/e2e/api-keys-settings.spec.ts` cover AC1–AC3 (`[SC-KEY-001]`..`[SC-KEY-004]`, `[SC-UX-004]`, `[SC-UX-005]`).

## Done means
Required checks green (including `npm run test:e2e`) · claims, security and test audits pass with zero unaddressed proved findings · PR merged with green CI on `main`.
