# S-011 — Store test identities and results within their project

Milestone: M1 First live run · Appetite: 1 session · Risk: high (cross-project references and stable test identity)
Covers: [P04-S01](../sprints/P04-S01-database-schema-design.md) suite, case, and result storage, plus the fingerprint portion of P04-S03 (`FR-ING-05`). Supplies storage for `FR-ING-03` and extends `FR-SEC-02`.

## Outcome

TestPulse can store suites, cases, and run results with stable test identities across operating systems. PostgreSQL keeps each suite, case, run, and result linked within its owning project.

## Acceptance criteria (EARS)

- **AC1** When the migration runs on a clean database or on an S-010 database with existing runs, PostgreSQL shall add `TestSuite`, `TestCase`, `TestResult`, `ResultStatus`, and `FlakyState` with the fields, indexes, and cascades in master plan §5 and the schema notes. Existing rows shall survive the migration.
- **AC2** When suites, cases, or results are inserted, PostgreSQL shall enforce `(projectId, filePath)`, `(projectId, identifier)`, and `(runId, testCaseId)` uniqueness respectively. If a case references a foreign suite, or a result references a foreign run or case, PostgreSQL shall reject the write even when the referenced IDs exist. Hard-delete cascades shall stay inside the owning project.
- **AC3** When code uses the tenant client, suite, case, and result reads and writes shall stay inside the resolved project. Ownership changes and relation access through another delegate shall preserve the same boundary, including relation filters, counts, and cascades.
- **AC4** When the same repository-relative path is reported with Windows or POSIX separators, or with a leading `./`, the shared fingerprint function shall produce the same lowercase SHA-256 hex value. Different runner projects, file paths, or title paths shall produce distinct identities for the fixture cases. The implementation shall follow ADR-007's NUL-separated inputs and preserve path case.

## Non-goals

The ingestion slices own HTTP request validation, concurrent auto-discovery and upsert behavior, and batch retry semantics. Flaky scoring and quarantine behavior belong to their later slices. Hosted smoke follows the local M1 journey.

## Contracts touched (read only these sections)

[Master plan §§5.1–5.2](../master/TestPulse_Master_Plan.md#5-domain-model--multi-tenant-data-schema), [§7.2](../master/TestPulse_Master_Plan.md#72-isolation-rules), [ADR-006](../../docs/architecture/adr-006-tenant-isolation.md), [ADR-007](../../docs/architecture/adr-007-ingestion-protocol.md#fingerprint-test-identity), and the [database schema notes](../../docs/database/schema.md). Update the schema notes with observed evidence.

## Risks to test explicitly

- Composite project-and-ID references must reject mismatched parent projects even for direct database writes. Exercise same-organization sibling projects and projects from different organizations.
- Preserve existing scoped run access. Verify the shape and order of the result indexes in PostgreSQL and test a shared fingerprint against a fixed SHA-256 vector.

## Tests written first

`packages/db/test/test-result-storage.acceptance.test.ts` covers AC1–AC3 (`SC-SEC-004`, with proposed `SC-ING-018` for migration and `SC-ING-019` for storage relationships). `packages/shared/src/fingerprint.acceptance.test.ts` covers AC4 (`SC-ING-009`, `SC-ING-010`). `SC-ING-011` follows with concurrent auto-discovery through ingestion.

## Done means

Acceptance tests fail for the expected reasons before implementation and pass afterward. `npm run verify` and independent reviews pass. Open the PR and review it again in a fresh session. Verify and push any fixes to the same branch, and record the follow-up review in the PR. The user merges after reading the evidence.
