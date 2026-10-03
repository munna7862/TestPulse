# S-001: A signed-in user can create and run their own organization

Milestone: M1 First live run · Appetite: 1 session · Risk: high (first tenant-scoped routes; sets the isolation
pattern every later route copies)
Replaces or covers: P03-S03 tasks 1–3, 5–7 (API only) · FR-ORG-01, FR-ORG-02 (API), FR-ORG-03 (soft delete),
FR-ORG-04, FR-SEC-01 (for these routes)

P03-S03 is split into three slices to stay under the ~800-line PR limit:
- **S-001 (this):** tenant-context preHandler, `plans.ts`, org CRUD, member list, ownership transfer.
- **S-002:** project settings columns, project CRUD under the org, the plan project limit, and the async purge job
  for soft-deleted orgs (finishes SC-ORG-004).
- **S-003:** web org switcher, create org/project dialogs, onboarding to the first project, project settings page
  (SC-ORG-009, SC-E2E-001).

## Outcome
After this ships, a verified user can create an organization and becomes its Owner. They can list the orgs
they belong to, view one org and its members, rename it as Owner or Admin, delete it as Owner, and hand
ownership to another member. Every route resolves `org → membership → role` in one preHandler, so callers who
are not members get 404 and members whose role is too low get 403.

## Acceptance criteria (EARS)
AC1 When a verified user sends `POST /api/v1/orgs` with a valid name, the API shall create the org with
`planTier = FREE` and a unique slug, make the caller its only `OWNER` in the same transaction, and return 201.
(SC-ORG-001)
AC2 If the requested or derived slug is already taken, then the API shall return `409 CONFLICT` and create no org
or membership, including when two requests for the same slug race. (Promise.all test)
AC3 When a user sends `GET /api/v1/orgs`, the API shall return only orgs where they have a membership and that are
not soft-deleted, each with the caller's role; with `?slug=` it shall return at most that one org from the
caller's memberships. (SC-ORG-002)
AC4 When a member sends `GET /api/v1/orgs/:orgId` or `GET /api/v1/orgs/:orgId/members`, the API shall return the
org or its member list (id, name, email, role, joinedAt), and nothing else about the users. (SC-ORG-002)
AC5 When an Owner or Admin sends `PATCH /api/v1/orgs/:orgId` with a new name, the API shall update it; if a Member
or Viewer sends it, then the API shall return `403 FORBIDDEN`. (SC-ORG-003)
AC6 When the Owner sends `DELETE /api/v1/orgs/:orgId`, the API shall set `deletedAt` and return 204, after which
every org route returns 404 for every caller; if an Admin or lower sends it, then the API shall return 403.
(SC-ORG-004, first half)
AC7 When the Owner sends `POST /api/v1/orgs/:orgId/transfer-ownership` naming an Admin of the org, the API shall
make that Admin `OWNER` and the previous Owner `ADMIN` in one transaction, so exactly one Owner exists afterwards,
including when two transfers race. (SC-ORG-005)
AC8 If anyone other than the Owner requests a transfer, the target is not a member, or the target is a Member,
Viewer or the Owner themself, then the API shall return 403, 404 or 400 `VALIDATION_ERROR` respectively and
change no roles. (SC-ORG-006; rbac-matrix `org.transferOwnership`)
AC9 If the caller is not a member of `:orgId`, or the org does not exist or is soft-deleted, then every route
under `/api/v1/orgs/:orgId` shall return `404 NOT_FOUND` with the same body. (SC-SEC-001)
AC10 While a route is registered under `/api/v1/orgs/:orgId`, the isolation table shall name its minimum role, and
a meta-test shall fail for any route missing from the table. (SC-SEC-002, SC-SEC-003)
AC11 The shared package shall export plan limits (master plan §8) and a pure `checkLimit(tier, limit, current)`
used by API and later UI. (Unit tests; enforcement lands in S-002 and P03-S04.)

## Non-goals
- Projects, the project plan limit and the purge job (S-002). Any web UI (S-003).
- Invitations, role changes and member removal (P03-S04). Real-time rooms for orgs.
- Org slug rename, org settings beyond `name`, plan changes (operator script only, master plan §8).

## Contracts touched (read only these sections)
Master plan §5 (Organization, OrgMember), §7.1 roles, §7.2 isolation rules, §8 plan limits. ADR-006 (tenant
isolation layers). New Zod schemas: `packages/shared/src/api/orgs.ts`, `packages/shared/src/plans.ts`.
Contract docs kept current: `docs/api/rest-api.md` §2 Organizations, `docs/security/rbac-matrix.md`.

## Risks to test explicitly
- Isolation: 404 for non-members (and soft-deleted orgs) and 403 for low roles, table-driven over every new route.
- Existence leak: non-member 404 and missing-org 404 bodies are identical.
- Races: slug create (AC2) and ownership transfer (AC7) each get a Promise.all test; the end state has exactly one
  Owner and one org.
- Owner safety: no route in this slice can leave an org with zero or two Owners.
- Free-tier profile: no new infra; DB only.

## Tests written first
`apps/api/src/modules/orgs/orgs.acceptance.test.ts` covers AC1–AC9;
`apps/api/src/plugins/tenant-context.acceptance.test.ts` covers AC9–AC10;
`packages/shared/src/plans.acceptance.test.ts` covers AC11.
SC IDs: SC-ORG-001…006, SC-SEC-001…003.

## Done means
Required checks green · claims audit shows no MISSING or STUB · security review of tenant context passes ·
staging smoke passes (once staging exists) · the user merged the PR.
