# Phase 03 — Sprint 05: API Key Generation and Management

## Sprint Objective

Implement project-scoped API key generation, validation, and management for CI integration authentication.

## Dependencies

P03-S04 RBAC enforcement.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Add the `ApiKey` model (`orgId`, `projectId`, `name`, `prefix`, `keyHash`, `createdById`, `lastUsedAt`, `expiresAt?`, `revokedAt?`). The `Project` model already exists from P03-S03.
2. `POST /api/v1/projects/:projectId/api-keys` (Admin+): generate `tp_live_` + 32 random bytes and return the plaintext exactly once.
3. `GET /api/v1/projects/:projectId/api-keys`: list name, prefix, creator, lastUsedAt, and status. Never return the hash.
4. `DELETE /api/v1/projects/:projectId/api-keys/:keyId`: revoke (soft delete), effective immediately.
5. Implement the `authenticateApiKey` preHandler for `/api/v1/ingest/*`: `Authorization: Bearer`, SHA-256 lookup, reject revoked or expired keys, resolve `{ orgId, projectId }`, and throttle `lastUsedAt` writes.
6. Ensure API keys are rejected (401) on every non-ingest route.
7. Add per-key and per-project rate limits on ingest routes (Redis-backed).
8. Web: API keys page with a show-once dialog, copy button, and a ready-to-paste reporter configuration snippet.

## Expected Files / Areas

`packages/db/prisma/schema.prisma`, `apps/api/src/modules/api-keys/`, `apps/api/src/plugins/api-key-auth.ts`, `apps/web/src/app/(app)/[org]/[project]/settings/api-keys/`

## Testing & Verification

Integration tests for key generation, authentication, revocation, and expiry. Security tests verifying that keys cannot call org, project, or user endpoints, and cannot ingest into another project.

## Acceptance Criteria

- [ ] API keys can be generated for projects by Admin+.
- [ ] The full key is displayed only once and only its hash is stored.
- [ ] The API key authenticates ingest requests and resolves the project context.
- [ ] Revoked or expired keys are rejected immediately.
- [ ] API keys cannot access any non-ingest endpoint.
- [ ] Key listing shows only the prefix and metadata.

## Risks / Guardrails

Storing API keys in plain text or logging them; API key scope too broad; per-request `lastUsedAt` writes becoming a hot spot; missing rate limiting on key-authenticated endpoints.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03 — Sprint 05: API Key Generation and Management.
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/03-phase-authentication-multi-tenancy.md
4. planning/sprints/P03-S05-api-key-generation.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P03_S05.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P03-S05.md and update task.md.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] New or changed screens have loading, empty and error states and pass the axe-core check in light and dark themes.
- [ ] Acceptance criteria verified.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
