# S-010 — Store test runs within their project

Milestone: M1 First live run · Appetite: 1 session · Risk: medium (migration and project isolation)
Replaces or covers: [P04-S01](../sprints/P04-S01-database-schema-design.md) run storage, `FR-ING-01` storage prerequisite, `FR-SEC-02` project-scoped DB coverage

## Outcome

TestPulse can store and retrieve a test run for its project through the tenant database client. PostgreSQL enforces unique run identity within each project so the later ingestion API can safely allocate a run number and handle reporter retries.

## Acceptance criteria (EARS)

- **AC1** When an empty database or a database with Phase 03 data is migrated, PostgreSQL shall create `TestRun` and `RunStatus` with the fields, status values, and indexes in master plan §5. Existing authentication, organization, project, API-key, and audit data shall survive the additive migration.
- **AC2** When a project-scoped client creates a run, PostgreSQL shall enforce both `(projectId, externalRunId)` and `(projectId, runNumber)` uniqueness. Different projects may reuse both identifiers. If the owning project is hard-deleted, its runs shall cascade with it and sibling projects' runs shall remain available.
- **AC3** When a caller uses `createTenantDb(ctx)`, run reads and writes shall stay inside the resolved project, including when an ID belongs to a sibling project or another organization. The client shall reject a missing project context, creation under a different project, and attempts to reassign ownership. New Prisma relation operations shall enforce the same project boundary.

## Non-goals

The next data slice owns suite, case, and result storage and fingerprinting. The ingestion slices own run-number allocation, request validation, quotas, and shard lifecycle. The higher-volume query-plan measurements belong with the query and performance slices. The [M1 roadmap](../roadmap.md) covers local live delivery and subsequent hosted smoke.

## Contracts touched (read only these sections)

[Master plan §§5.1–5.2](../master/TestPulse_Master_Plan.md#5-domain-model--multi-tenant-data-schema), [§7.2](../master/TestPulse_Master_Plan.md#72-isolation-rules), [ADR-006](../../docs/architecture/adr-006-tenant-isolation.md), and the [database schema notes](../../docs/database/schema.md). Update the schema notes with observed migration and isolation evidence. Any canonical change goes through the ADR process.

## Risks to test explicitly

- Scope both the selected row and its ownership. A write or nested relation operation must preserve the project boundary.
- Verify the migration against populated Phase 03 data and verify cascade behavior with a sibling project present. Compare the declared indexes with PostgreSQL metadata.

## Tests written first

`packages/db/test/run-storage.acceptance.test.ts` covers AC1–AC3 with the PostgreSQL test harness. Use existing `SC-SEC-004` for tenant-client behavior. Register proposed `SC-ING-016` for schema and migration compatibility and `SC-ING-017` for storage identity and cascade. `SC-ING-001` and `SC-ING-002` cover the later HTTP start behavior.

## Done means

Acceptance tests fail for the expected reasons before implementation and pass afterward. `npm run verify` and independent reviews pass. The user merges the PR with green checks.
