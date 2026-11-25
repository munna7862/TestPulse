# S-004a: Web workspace switcher, creation dialogs & sidebar quota

Milestone: M1 First live run · Appetite: 1 session · Risk: medium (shared shell layout across existing /runs and /settings/profile E2E specs)
Replaces or covers: P03-S03 tasks 8–9 (part 1 — onboarding checklist & /settings/project follow immediately in S-004b) · FR-ORG-01, FR-ORG-02, FR-ORG-03

## Outcome

A signed-in user sees their real organizations and projects in the header switcher and sidebar quota footer, can switch organizations and projects with `localStorage` persistence, and can create organizations and projects via validated dialogs that enforce plan limits and caller role.

## Acceptance criteria (EARS)

AC1 When a signed-in user opens the app shell, `WorkspaceSwitcher` shall load their organizations and active organization's projects, allow switching between them, persist the selection in `localStorage`, and discard stale out-of-order project responses.
AC2 When a user submits `CreateOrgDialog` or an Admin/Owner submits `CreateProjectDialog`, the client shall validate inputs with `@testpulse/shared` schemas, call `POST /api/v1/orgs` or `POST /api/v1/orgs/:orgId/projects`, switch to the new resource on success, and surface friendly alerts on `409 CONFLICT`, `403 PLAN_LIMIT_REACHED`, or `403 EMAIL_NOT_VERIFIED`.
AC3 While viewing the app shell, `AppSidebar` shall reflect the active organization's `planTier` limit and retention days from `PLAN_LIMITS`.
AC4 Whenever the workspace switcher or creation dialogs load or error, they shall provide accessible loading, empty, and error states with retry, render all user-supplied strings as text (no `dangerouslySetInnerHTML`), and pass `axe-core` with 0 violations in light and dark themes.

## Non-goals

- First-run `OnboardingChecklist` on `/runs` and `/settings/project` edit/delete page → immediate next slice **S-004b**.
- Invitations UI, member role management, org settings/transfer UI → **P03-S04**.
- API key creation and copy UI → **P03-S05**.

## Contracts touched (read only these sections)

Master plan §4.4 (free profile `/api/*` rewrite), §5 (Organization & Project models), §7 (RBAC), §8 (plan limits).
Shared schemas: `packages/shared/src/plans.ts`, `packages/shared/src/api/orgs.ts`, `packages/shared/src/api/projects.ts`.

## Risks to test explicitly

- Existing shell E2E isolation: `/runs` and `/settings/profile` in `catalog.spec.ts` and `oauth.spec.ts` must continue passing with 0 `role="alert"` collisions in `<main>` on `/settings/profile` and valid landmarks/axe on `/runs` even when `/api/v1/orgs` fails.
- Out-of-order async races: switching organizations rapidly aborts/ignores stale `listProjects` responses.
- Role gating: Member/Viewer never sees `"New project"` in the switcher.
- Tailwind v4 scanning `@testpulse/ui` dialog classes via `@source` on `Dialog.tsx`.

## Tests written first

- `apps/web/src/lib/workspace.acceptance.test.ts` (+ `apps/web/src/lib/workspace-helpers.test.ts`)
- `apps/web/e2e/workspace.spec.ts`. SC IDs: `SC-ORG-001`, `SC-ORG-002`, `SC-ORG-008`.

## Done means

Required checks green (`npm run verify`, `npm run test:e2e`, `npm run check:pr-size < 800`, CI `Verify Quality Gates` + `Playwright E2E Smoke Tests`) · Round 1 & Round 2 independent reviews clean · PR merged into `main`.
