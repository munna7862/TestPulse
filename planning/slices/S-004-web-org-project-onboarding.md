# S-004: Web org switcher, dialogs, project settings & onboarding

Milestone: M1 First live run · Appetite: 1 session · Risk: medium (shared shell layout across existing /runs and /settings/profile E2E specs)
Replaces or covers: P03-S03 tasks 8–9 · FR-ORG-01, FR-ORG-02, FR-ORG-03, FR-ORG-05, FR-ORG-06

## Outcome

A signed-in user sees their real organizations and projects in the header switcher and sidebar quota footer, can switch workspaces with `localStorage` persistence, create organizations and projects via validated dialogs, complete a first-run onboarding checklist when starting without an org or project (while invited users with an org and project go straight to their workspace), and view, update, or delete project settings according to their org role.

## Acceptance criteria (EARS)

AC1 When a signed-in user opens the app shell, `WorkspaceSwitcher` shall load their organizations and active organization's projects, allow switching between them, persist the selection in `localStorage`, and discard stale out-of-order project responses.
AC2 When a user submits `CreateOrgDialog` or an Admin/Owner submits `CreateProjectDialog`, the client shall validate inputs with `@testpulse/shared` schemas, call `POST /api/v1/orgs` or `POST /api/v1/orgs/:orgId/projects`, switch to the new resource on success, and surface friendly alerts on `409 CONFLICT`, `403 PLAN_LIMIT_REACHED`, or `403 EMAIL_NOT_VERIFIED`.
AC3 While a signed-in user has no organizations (or their active org has no projects), `/runs` shall render the golden-path `OnboardingChecklist` guiding them to create an organization and first project; when they already belong to an org with a project (e.g., via invitation), `/runs` shall skip onboarding and show the workspace dashboard directly.
AC4 When an Admin or Owner opens `/settings/project`, the page shall allow updating `name`, `description`, `defaultBranch`, `slaDays` (7/14/30/60), and `retentionDays` (showing effective plan-capped retention from `PLAN_LIMITS`) via `PATCH /api/v1/projects/:projectId` and soft-deleting the project via a confirmation dialog (`DELETE /api/v1/projects/:projectId`); while a Member or Viewer views `/settings/project`, the form shall be read-only with no Save or Delete controls.
AC5 Whenever any new or changed view (`/runs`, `/settings/project`, dialogs) loads, fails, or is empty, it shall render accessible loading, empty, and error states (with retry), display all user-supplied strings as text (no `dangerouslySetInnerHTML`), and pass `axe-core` with 0 violations in light and dark themes.

## Non-goals

- Invitations UI, member role management, org settings/transfer UI (P03-S04).
- API key creation and copy UI (P03-S05).
- Flaky-window, flaky-threshold, and tracked-branch settings (P06-S01).

## Contracts touched (read only these sections)

Master plan §4.4 (free profile `/api/*` rewrite), §5 (Organization & Project models), §7 (RBAC), §8 (plan limits).
Shared schemas: `packages/shared/src/plans.ts`, `packages/shared/src/api/orgs.ts`, `packages/shared/src/api/projects.ts`.

## Risks to test explicitly

- Existing shell E2E isolation: `/runs` and `/settings/profile` in `catalog.spec.ts` and `oauth.spec.ts` must continue passing with 0 `role="alert"` collisions in `<main>` on `/settings/profile` and valid landmarks/axe on `/runs` even when `/api/v1/orgs` fails.
- Out-of-order async races: switching organizations rapidly must abort/ignore stale `listProjects` responses.
- Role gating: Member/Viewer never receives Save or Delete buttons on `/settings/project` or `"New project"` in the switcher.
- Plan limits: `FREE` tier 2-project cap disables creation cleanly and effective retention caps by `PLAN_LIMITS[tier].retentionDays`.

## Tests written first

- `apps/web/src/lib/workspace.acceptance.test.ts` (covers pure helpers, HTTP client, 204 DELETE, Zod parsing, friendly error formatting)
- `apps/web/e2e/workspace.spec.ts` (covers AC1–AC5 and axe light/dark checks). SC IDs: `SC-ORG-001`, `SC-ORG-002`, `SC-ORG-007`, `SC-ORG-008`, `SC-ORG-009`.

## Done means

Required checks green (`npm run verify`, `npm run test:e2e`, `npm run check:pr-size < 800`, CI `Verify Quality Gates` + `Playwright E2E Smoke Tests`) · Round 1 & Round 2 independent reviews clean · PR merged into `main`.
