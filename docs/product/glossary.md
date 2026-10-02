# Glossary

> **Sprint:** P01-S01 · Terms are used with exactly these meanings in code, UI copy, docs, and tests.

| Term | Definition |
| :--- | :--- |
| **Organization (org)** | The tenant boundary. Owns projects, members, and plan limits. |
| **Project** | A product or repository within an org. Owns API keys, runs, test cases, quarantines, webhooks, and settings. |
| **Member / role** | A user's membership in an org with one role: Owner, Admin, Member, or Viewer (master plan §7). Roles apply to all projects in the org. |
| **API key** | Project-scoped secret (`tp_live_…`) used by CI to call `/api/v1/ingest/*`. Stored only as a hash. |
| **Run** | One logical CI execution of a test suite, identified by `externalRunId`. May consist of several **shards**. Has a sequential `runNumber` per project. |
| **Shard** | A slice of a run executed by a separate CI job or machine (e.g. Playwright `--shard=1/4`). All shards with the same `externalRunId` form one run. |
| **External run ID** | A stable identifier the reporter derives from CI metadata (e.g. `github:<run_id>:<attempt>`), shared by all shards. |
| **Batch** | Up to 1,000 results sent in one ingestion request. Retrying a batch is safe (idempotent). |
| **Test suite** | The file a test lives in (POSIX-normalized path relative to the repo root). |
| **Test case** | A unique test, identified by its **fingerprint**. Persists across runs. |
| **Fingerprint** | SHA-256 of runner project + normalized file path + title path (ADR-007). Identical on Windows and Linux. Renaming or moving a test creates a new test case. |
| **Title path** | The nested test titles (`describe` › `describe` › `test`). |
| **Runner project** | A Playwright project (e.g. `chromium`) or Vitest workspace project. Part of the fingerprint. |
| **Result** | The outcome of one test case in one run: PASSED, FAILED, SKIPPED, or FLAKY (PRD §5.1). |
| **Flaky result** | A result that failed and then passed on retry within the same run. |
| **Flaky state** | Per-test-case assessment: STABLE, SUSPECTED, or FLAKY, with a score from 0 to 100 (PRD §5.3). |
| **Tracked branches** | Branches whose history feeds the transition heuristic (default: the project's default branch). |
| **Quarantine** | A record stating that a test is known-unreliable, with a reason, an assignee, and an SLA. States: ACTIVE, INVESTIGATING, RESOLVED, DISMISSED (PRD §5.4). |
| **Known failure** | A FAILED result of a test that has an open quarantine. Shown separately from new failures. |
| **Advisory / non-blocking mode** | Whether quarantine affects the CI exit code. Advisory is the default; non-blocking is opt-in (PRD §6). |
| **SLA** | The number of days (7/14/30/60) a quarantine may stay open. `slaDueAt = createdAt + slaDays`. |
| **SLA markers** | Warned (80%), Escalated (100%), and Overdue (200%). Timestamps set once each, not states. |
| **MTTR** | Mean time to resolution: the average `closedAt − createdAt` of RESOLVED quarantines (dismissed ones are excluded and reported separately). |
| **Annotation** | A comment on a test case. May @mention org members. |
| **Label** | A user-applied tag on a test case. Runner-provided tags are separate. |
| **Domain event** | An internal event (e.g. `quarantine.sla_warning`) on the BullMQ `domain-events` queue, consumed by notifications and webhooks. |
| **Real-time event** | A Socket.IO message (e.g. `run:progress`) sent to a project or user room. Lean payload; clients refetch details. |
| **Room** | A Socket.IO channel: `project:{projectId}` or `user:{userId}`. Joining requires membership. |
| **Socket ticket** | A 60-second, single-use token used to authenticate a WebSocket connection. |
| **Deployment profile** | Free (development) or paid (production) hosting configuration (master plan §4.4). |
| **Cold start** | The delay while a sleeping free-tier service wakes (~30–60 s). |
| **Plan / quota** | Free, Pro, or Enterprise limits on projects, members, runs per month, and retention (master plan §8). |
| **Effective retention** | `min(project.retentionDays, plan maximum)`. Raw results older than this are deleted; daily aggregates are kept. |
| **TTFV** | Time to first value: from sign-up to the first live run (target ≤ 10 minutes). |
| **FR / SC IDs** | Feature (`FR-*`) and scenario (`SC-*`) identifiers used for traceability (master plan D-15). |
