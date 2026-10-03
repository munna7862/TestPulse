# S-002: An Admin can create, configure and delete projects within the plan limit

Milestone: M1 First live run · Appetite: 1 session · Risk: high (second tenant prefix
`/api/v1/projects/:projectId` that every later project route copies; quota check under concurrency)
Replaces or covers: P03-S03 task 4 (API) · FR-ORG-05 (create, read, update basic settings, delete), FR-PLAN-01
(project limit), FR-SEC-01 (for these routes)

P03-S03 is now four slices: S-001 orgs (merged, PR #13) · **S-002 projects (this)** · S-003 purge job for
soft-deleted orgs and projects · S-004 web UI and onboarding. The purge job moved out of this slice to keep it
under the size limit and because it adds queue wiring of its own.

## Outcome
After this ships, an Owner or Admin can create a project in their org with default settings, list and view
projects (any member), rename it and edit its basic settings, and delete it. A Free org stops at 2 projects with
`403 PLAN_LIMIT_REACHED`. Every route under `/api/v1/projects/:projectId` resolves
`project → org → membership → role` through the same guard as org routes, so outsiders get 404 and low roles 403.

## Acceptance criteria (EARS)
AC1 When an Owner or Admin sends `POST /api/v1/orgs/:orgId/projects` with a valid name, the API shall create the
project with a unique-in-org slug (given or derived) and the defaults `defaultBranch "main"`, `slaDays 14`,
`retentionDays 30`, `flakyWindow 10`, `flakyThreshold 3`, `trackedBranches ["main"]`, `runCounter 0`, and return
201. If a Member or Viewer sends it, then the API shall return 403. (SC-ORG-007)
AC2 If the slug is already used by a project in the same org (including a soft-deleted one not yet purged), then
the API shall return `409 CONFLICT`; the same slug in a different org shall be allowed. (SC-ORG-008)
AC3 If creating the project would exceed the org's plan limit (`checkLimit(tier, "projectsPerOrg", live
projects)`), then the API shall return `403 PLAN_LIMIT_REACHED` with the limit in `details`, and create nothing.
While several creates race on a Free org with one project, at most one shall succeed. (SC-PLAN-001, API part)
AC4 When a member sends `GET /api/v1/orgs/:orgId/projects` (optionally `?slug=`), the API shall return the org's
live projects with settings; `GET /api/v1/projects/:projectId` shall return one project with settings and the
caller's role. (SC-ORG-007)
AC5 When an Owner or Admin sends `PATCH /api/v1/projects/:projectId` with any of `name`, `description`,
`defaultBranch`, `slaDays` (7, 14, 30 or 60) or `retentionDays` (1–365), the API shall update only those fields;
if a Member or Viewer sends it, then the API shall return 403. Flaky settings stay read-only until P06-S01.
AC6 When an Owner or Admin sends `DELETE /api/v1/projects/:projectId`, the API shall soft-delete it and return
204, after which every route for that project returns 404 and it no longer counts toward the plan limit; a
Member or Viewer gets 403.
AC7 If the caller is not a member of the project's org, or the project or its org does not exist or is
soft-deleted, or the id is malformed, then every route under `/api/v1/projects/:projectId` shall return the same
`404 NOT_FOUND`. (SC-SEC-001)
AC8 While a route is registered under `/api/v1/projects/:`, the isolation table shall name its minimum role, the
parameter shall be named exactly `:projectId`, and startup shall fail otherwise; the table-driven 404/403 tests
shall cover every entry. (SC-SEC-002, SC-SEC-003)
AC9 Writes to a project (update, delete) shall re-check the caller's role in the write itself, as org writes do.

## Non-goals
- Purging soft-deleted orgs and projects (S-003). Web UI (S-004).
- Editing `flakyWindow`, `flakyThreshold`, `trackedBranches` (P06-S01). API keys (P03-S05). Project-level roles
  (none in v1, master plan §7.1). Member limit (P03-S04).

## Decisions to confirm
- `retentionDays` default **30** (range 1–365). Effective retention stays `min(project, plan max)`, so a Free
  project keeps 7 days until upgraded. The master plan gives no default.
- Soft-deleted projects keep their slug until S-003 purges them (409 meanwhile) but stop counting toward the limit.
- The project-route resolver finds the project and the caller's membership in one query, filtered by the caller's
  `userId`. It uses the system client because the org is unknown until the project is found (the org resolver uses
  the tenant client). Review found this outside ADR-006's system-client list, so ADR-006 gains amendment 1 in this
  PR covering it and S-001's "my orgs" listing.

## Contracts touched (read only these sections)
Master plan §5 (Project), §7.1–7.2, §8. RBAC matrix `project.*`. `docs/api/rest-api.md` §2 Organizations
(project collection) and Projects. New Zod schemas: `packages/shared/src/api/projects.ts`. Migration: Project
settings columns + `deletedAt`, additive with defaults.

## Risks to test explicitly
- Isolation: the AC7/AC8 table-driven suite over every project route, plus a cross-org case where the project id
  belongs to another org the caller is *not* in, and one where the caller is in a *different* org of their own.
- Races: 3 concurrent creates on a Free org with 1 project → exactly one 201, two 403; and 2 concurrent creates
  with the same slug → one 201, one 409. The quota check serializes on the org row inside the create transaction.
- Stale role: delete and update re-check role at write time (barrier test like S-001 F3).
- Free-tier profile: DB only, no new infra.

## Tests written first
`apps/api/test/projects/projects.acceptance.test.ts` covers AC1–AC6 and AC9;
`apps/api/test/projects/project-tenant-context.acceptance.test.ts` covers AC7–AC8.
SC IDs: SC-ORG-007, SC-ORG-008, SC-PLAN-001, SC-SEC-001…003.

## Done means
Required checks green · claims audit shows no MISSING or STUB · security review of the project resolver passes ·
the user merged the PR.
