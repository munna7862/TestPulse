# Ingestion API Contract (v1)

> **Sprint:** P01-S03 (design) → implemented in P04-S02/S03/S06, consumed by `@testpulse/reporter` (P04-S05). The design rationale is in [ADR-007](../architecture/adr-007-ingestion-protocol.md). Canonical summary: master plan §4.2.
> These shapes become Zod schemas in `packages/shared/src/schemas/ingest.ts`. If they differ, the Zod schemas win and this document must be updated in the same PR. The ingestion API is a **public API** from P04-S05 onward: breaking changes require `/api/v2`.

## Common

- **Base:** `https://<api-host>/api/v1/ingest`
- **Auth:** `Authorization: Bearer tp_live_<key>` (project-scoped). The key determines the project.
- **Content type:** `application/json`; gzip request bodies are accepted (`Content-Encoding: gzip`).
- **Envelope:** `{ "success": true, "data": … }` or `{ "success": false, "error": { "code", "message", "details?" } }`.
- **Idempotency:** run start is idempotent on `externalRunId`; results are idempotent on `(runId, testCaseId)`.
- **Rate limits:** per key and per project (values set in P04-S06), returned as `429 RATE_LIMITED` with a `Retry-After` header.

## 1. Start run

`POST /api/v1/ingest/runs`

```ts
StartRunBody = {
  externalRunId: string(1..200)        // shared by all shards (ADR-007)
  branch: string(1..255)
  commitSha: string(7..64)             // hex
  ciProvider: "github" | "gitlab" | "jenkins" | "circleci" | "other" | "local"
  ciJobUrl?: url(..2048)
  environment?: string(..100)          // e.g. "staging", "chromium-nightly"
  shardIndex: int >= 1                 // 1-based
  shardTotal: int >= 1, >= shardIndex  // must match the first shard's value
  expectedTestCount?: int >= 0         // this shard's planned tests (progress bar)
  runner: { name: "playwright" | "vitest" | "other", version?: string(..50) }
  reporterVersion: string(..50)
  startedAt: ISO-8601 datetime
}
StartRunResponse = { runId: string, runNumber: int, created: boolean, dashboardUrl: url }
```

| Case | Status |
| :--- | :--- |
| New `externalRunId` | `201`, `created: true`, emits `run:started` |
| Existing `externalRunId` (another shard or a retry) | `200`, `created: false`; `expectedTestCount` is summed across distinct shards |
| `shardTotal` differs from the existing run's | `409 SHARD_MISMATCH` |
| Monthly run quota exhausted (new run only) | `429 QUOTA_EXCEEDED` (`details.resetsAt`) |
| Run already completed or timed out with this `externalRunId` | `409 RUN_COMPLETED` |

## 2. Send results

`POST /api/v1/ingest/runs/:runId/results` — max 1,000 results and 5 MB (uncompressed) per request.

```ts
ResultsBatchBody = {
  batchId: uuid                         // for logs/tracing; idempotency comes from the upsert key
  shardIndex: int >= 1
  results: Array<(1..1000) {
    filePath: string(1..1024)           // POSIX, relative to repo root
    titlePath: string(1..1024)[] (1..20)
    runnerProject?: string(..100)
    status: "passed" | "failed" | "skipped" | "flaky"   // flaky = failed then passed on retry
    retryCount: int >= 0 (..20)
    durationMs: int >= 0
    errorMessage?: string(..4096)
    stackTrace?: string(..32768)
    tags?: string(..100)[] (..20)
    startedAt?: ISO-8601 datetime
  }>
}
ResultsBatchResponse = { accepted: int, counters: RunCounters }
RunCounters = { total, passed, failed, skipped, flaky, quarantinedFailed: int }
```

- Server side: compute the fingerprint (normalizing defensively), upsert suite and case, upsert the result, update counters and `lastActivityAt` in **one transaction**, then (after commit) emit `run:progress`.
- A result for a test that is already stored in this run **replaces** it (latest report wins). Counters are recomputed so they stay exact.

| Case | Status |
| :--- | :--- |
| Valid batch | `200` |
| Any invalid item | `400 VALIDATION_ERROR`, `details.items: [{ index, path, message }]`; nothing stored |
| More than 1,000 items | `400 VALIDATION_ERROR` |
| Body over 5 MB | `413 PAYLOAD_TOO_LARGE` |
| Unknown run, or a run of another project | `404 RUN_NOT_FOUND` |
| Run completed, timed out, or cancelled | `409 RUN_COMPLETED` |

## 3. Complete shard

`POST /api/v1/ingest/runs/:runId/complete`

```ts
CompleteRunBody = { shardIndex: int >= 1, outcome: "passed" | "failed" | "interrupted", finishedAt: ISO-8601 datetime }
CompleteRunResponse = { runStatus: "RUNNING" | "PASSED" | "FAILED" | "CANCELLED", shardsCompleted: int, shardTotal: int }
```

- Completing the same shard twice is idempotent (`200`, same response).
- When all shards are complete:
  - Status is `CANCELLED` if any shard reported `interrupted`.
  - Otherwise `FAILED` if `failed > 0` (quarantined failures included; PRD §6).
  - Otherwise `PASSED`.
  - Then emit `run:completed`, enqueue `flaky-analysis`, and enqueue the `run.failed` or `run.recovered` domain event (recovered = the previous completed run on the same branch had failed).

## 4. Quarantined tests (reporter quarantine mode)

`GET /api/v1/ingest/quarantined-tests` → `{ identifiers: string[], generatedAt }`. Lists the fingerprints of tests with an open (ACTIVE/INVESTIGATING) quarantine in the key's project. Clients cache it for the duration of the run.

## 5. Run summary (CI-side GitHub reporting)

`GET /api/v1/ingest/runs/:runId/summary`

```ts
RunSummary = {
  runId, runNumber, status, counters: RunCounters, durationMs?,
  newFailures: Array<{ title, filePath, testCaseUrl }> (..50),
  quarantinedFailures: Array<{ title, filePath, testCaseUrl }> (..50),
  flaky: Array<{ title, filePath, testCaseUrl }> (..50),
  dashboardUrl
}
```

## 6. Error codes

| Code | HTTP | Meaning | Reporter behavior |
| :--- | :--- | :--- | :--- |
| `INVALID_API_KEY` | 401 | Missing, unknown, revoked, or expired key | Warn once and disable for the rest of the run |
| `VALIDATION_ERROR` | 400 | Schema violation | Warn with a hint to upgrade the reporter; drop that batch |
| `PAYLOAD_TOO_LARGE` | 413 | Body over 5 MB | Split the batch and retry |
| `RUN_NOT_FOUND` | 404 | Wrong run or project | Warn; disable for the rest of the run |
| `RUN_COMPLETED` | 409 | Run already final | Warn; stop sending |
| `SHARD_MISMATCH` | 409 | Inconsistent `shardTotal` | Warn; disable |
| `QUOTA_EXCEEDED` | 429 | Monthly run quota exhausted | Warn once ("results not recorded until …"); disable |
| `RATE_LIMITED` | 429 | Too many requests | Back off (`Retry-After`), keep buffering |
| `INTERNAL` / 5xx / network / timeout | 5xx | Server or transport problem | Retry with exponential backoff and jitter; the first request waits up to 60 s (free-tier cold start) |

**Invariant:** none of these change the test runner's exit code (FR-REP-06). The only exception is opt-in quarantine mode, which can turn a failure-only-from-quarantined-tests outcome into a pass (PRD §6).

## 7. Example: minimal flow (curl)

```bash
curl -sS -X POST "$API/api/v1/ingest/runs" -H "Authorization: Bearer $TESTPULSE_API_KEY" -H "Content-Type: application/json" -d '{"externalRunId":"local:demo-1","branch":"main","commitSha":"a1b2c3d","ciProvider":"local","shardIndex":1,"shardTotal":1,"runner":{"name":"other"},"reporterVersion":"curl","startedAt":"2026-10-02T10:00:00Z"}'
```

```bash
curl -sS -X POST "$API/api/v1/ingest/runs/$RUN_ID/results" -H "Authorization: Bearer $TESTPULSE_API_KEY" -H "Content-Type: application/json" -d '{"batchId":"6f1c2d0e-7a51-4e7e-9a0f-0c3b8f6a1d22","shardIndex":1,"results":[{"filePath":"tests/home.spec.ts","titlePath":["home","renders hero"],"status":"passed","retryCount":0,"durationMs":412}]}'
```

```bash
curl -sS -X POST "$API/api/v1/ingest/runs/$RUN_ID/complete" -H "Authorization: Bearer $TESTPULSE_API_KEY" -H "Content-Type: application/json" -d '{"shardIndex":1,"outcome":"passed","finishedAt":"2026-10-02T10:01:00Z"}'
```
