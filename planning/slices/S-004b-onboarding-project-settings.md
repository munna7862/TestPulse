# S-004b: Onboarding checklist & project settings page

Milestone: M1 First live run · Appetite: 1 session · Risk: medium (shared shell layout across /runs and /settings/profile E2E specs)
Replaces or covers: P03-S03 tasks 8–9 (part 2 — builds on S-004a) · FR-ORG-05, FR-ORG-06

## Outcome

New non-invited users landing on `/runs` without an organization or project see the golden-path `OnboardingChecklist` (create org → create first project → connect CI reporter), while invited users who already belong to an org with a project skip onboarding cleanly. Any member can open `/settings/project` via the Settings navigation tabs or header Account menu; Admins and Owners can update project name, description, default branch, quarantine SLA, and retention days (seeing effective plan-capped retention) or soft-delete via a confirmation dialog, while Members and Viewers see a read-only view.

## Acceptance criteria (EARS)

AC1 While a signed-in user has no organizations (or their active org has no projects after project load completes), `/runs` shall render `OnboardingChecklist` with actionable CTAs opening `CreateOrgDialog` / `CreateProjectDialog` (or an informational note for Member/Viewer when no projects exist); when the user already belongs to an org and project (e.g., via invitation), `/runs` shall omit `OnboardingChecklist`.
AC2 When an Admin or Owner submits `/settings/project`, the form shall validate `name`, `description`, `defaultBranch`, `slaDays` (7/14/30/60), and `retentionDays` (1–365) with `UpdateProjectBodySchema`, send `PATCH /api/v1/projects/:projectId`, update `WorkspaceProvider` state (syncing the header switcher), and display `"Project settings saved."` or a friendly `role="alert"` on error.
AC3 When an Admin or Owner confirms project deletion in the Danger Zone dialog, `/settings/project` shall call `DELETE /api/v1/projects/:projectId`, remove the project from `WorkspaceProvider` (falling back to the next remaining project or empty state), and prevent closing the dialog while deletion is in flight.
AC4 While a Member or Viewer views `/settings/project`, all inputs and selects shall be disabled with a read-only notice, and no `"Save changes"` or `"Delete project"` controls shall render.
AC5 Whenever `/runs` or `/settings/project` loads, fails, or is empty, it shall render accessible loading, empty, and error+retry states, display user-supplied values as plain text (no `dangerouslySetInnerHTML`), and pass `axe-core` with 0 violations in light and dark themes.

## Non-goals

- Invitations UI, member role management, org settings/transfer UI → **P03-S04**.
- API key creation and copy UI → **P03-S05**.
- Flaky-window, flaky-threshold, and tracked-branch settings → **P06-S01**.

## Contracts touched (read only these sections)

Master plan §5 (Organization & Project models), §7 (RBAC), §8 (plan limits).
Shared schemas: `packages/shared/src/plans.ts`, `packages/shared/src/api/projects.ts`.

## Risks to test explicitly

- `/runs` & `/settings/profile` existing E2E isolation: `catalog.spec.ts` and `oauth.spec.ts` must continue passing without unexpected `role="alert"` collisions or missing `<h1>` / `Live` landmarks.
- Tailwind v4 scanning `@testpulse/ui` `Select.tsx` positioning/classes via `@source`.
- Role gating: Member/Viewer never receives Save or Delete controls on `/settings/project` or `"Create project"` in onboarding.

## Tests written first

- `apps/web/src/lib/project-settings.acceptance.test.ts` (covers `validateUpdateProjectInput` and `formatEffectiveRetentionHint`)
- `apps/web/e2e/project-settings.spec.ts` (covers AC1–AC5 and axe light/dark checks). SC IDs: `SC-ORG-007`, `SC-ORG-009`.

## Done means

Required checks green (`npm run verify`, `npm run test:e2e`, `npm run check:pr-size < 800`, CI `Verify Quality Gates` + `Playwright E2E Smoke Tests`) · Round 1 & Round 2 independent reviews clean · PR merged into `main`.
