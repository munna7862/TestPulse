# ADR-007: Incremental Ingestion Protocol & Test Fingerprints

## Status
Accepted (P01-S03, 2026-10). Closes Open Decision Q6. The wire contract is specified in [`docs/api/ingestion.md`](../api/ingestion.md).

## Context
- "Live" means results are visible **while** CI runs, so a single end-of-run upload is not enough.
- CI suites are commonly **sharded** across machines; each shard runs its own reporter process.
- Networks fail and reporters retry, so writes must be idempotent.
- The same test runs on Windows and Linux runners, in several Playwright projects (browsers), and is sometimes renamed.

## Decision

### Protocol
1. `POST /api/v1/ingest/runs` once per shard. It is idempotent on `(projectId, externalRunId)`; the first call creates the run, later calls (other shards, retries) join it.
2. `POST /api/v1/ingest/runs/:runId/results` repeatedly (the reporter flushes every ~1 s or 200 results; max 1,000 items and 5 MB per batch). Results are upserted on `(runId, testCaseId)`: a later report of the same test in the same run replaces the earlier one, and retried batches change nothing.
3. `POST /api/v1/ingest/runs/:runId/complete` once per shard. When `shardsCompleted = shardTotal`, the final status is computed and post-run work is enqueued.
4. The project comes from the API key. Run IDs belonging to other projects return 404.
5. A whole batch is rejected on any validation error (per-index details), keeping state simple. The reporter truncates fields beforehand, so a validation error indicates a reporter bug, not user data.
6. The stale-run reaper times out runs with no activity for 30 minutes.

### External run ID
Derived by the reporter from CI metadata, so all shards agree: `github:<GITHUB_RUN_ID>:<GITHUB_RUN_ATTEMPT>`, `gitlab:<CI_PIPELINE_ID>`, `jenkins:<BUILD_TAG>`, `circleci:<CIRCLE_WORKFLOW_ID>`. Outside CI it is a random UUID per process (unsharded). `TESTPULSE_RUN_ID` overrides it.

### Fingerprint (test identity)
```text
identifier = sha256_hex( runnerProject + "\u0000" + filePath + "\u0000" + titlePath.join("\u0000") )
filePath   = path relative to the repository root, with "\" replaced by "/", no leading "./", case preserved
runnerProject = Playwright project name / Vitest workspace project name, or "" if none
```
The same function lives in `@testpulse/shared` and is used by the reporter (when sending) and the API (when re-normalizing defensively).

### Renames and moves (Q6)
A renamed or moved test produces a **new** test case; history does not carry over. This is a documented v1 limitation. Manual "merge test cases" is a post-MVP backlog item.

## Consequences
- **Positive:** live streaming, correct shard aggregation, and safe retries without client-side coordination; stable cross-OS identity.
- **Negative / trade-offs:** more requests per run (about one per second per shard); renames lose history; whole-batch rejection could drop up to 1,000 results if the reporter has a bug.
- **Mitigation:** rate limits sized for batching (P04-S06); reporter contract tests against the real API schema; field truncation in the reporter.

## Alternatives considered
- **Single upload at the end:** no live view; one huge request; shards would create separate runs.
- **One request per test:** too chatty (10,000 requests per run).
- **Partial acceptance of batches:** more complex counters and error reporting for little benefit.
- **Fingerprint on title only:** collides across files and browsers.
