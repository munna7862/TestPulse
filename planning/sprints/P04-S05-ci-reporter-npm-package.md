# Phase 04 — Sprint 05: CI Reporter npm Package (Playwright + Vitest)

## Sprint Objective

Build `@testpulse/reporter`, which streams results to TestPulse while tests run and can never fail the customer's CI.

## Dependencies

P04-S02 ingestion API.

## Personas

- **Lead:** `role-backend-engineer`
- **Reviewers / sign-off:** `role-sdet-architect`, `role-growth-engineer`, `role-security-engineer`

## Scope

### Granular Implementation Tasks

1. Set up packages/reporter with a tsup build (ESM + CJS + types) that bundles the `@testpulse/shared` code it uses. Peer dependencies: `@playwright/test`, `vitest`. No other runtime dependencies (use the global `fetch`).
2. Playwright reporter: `onBegin` → start run (with `expectedTestCount` and shard info from the config); `onTestEnd` → buffer the final outcome per test (passed after retry → FLAKY, with `retryCount`); flush every ~1 s or 200 results; `onEnd` → final flush + complete.
3. Vitest reporter with the equivalent lifecycle, including retry information.
4. Configuration via `TESTPULSE_API_KEY`, `TESTPULSE_API_URL`, `TESTPULSE_RUN_ID` (override), `TESTPULSE_DISABLED`, plus typed reporter options.
5. CI metadata auto-detection (GitHub Actions, GitLab CI, Jenkins, CircleCI, generic) and an `externalRunId` that is stable across shards (e.g. `github:<GITHUB_RUN_ID>:<GITHUB_RUN_ATTEMPT>`).
6. Normalize paths (shared utility), truncate fields to the API limits, strip ANSI codes, and optionally redact common secret patterns from error output.
7. Resilience: retries with backoff and jitter on 5xx/429, a generous first-request timeout (60 s) to absorb free-tier cold starts, a bounded in-memory buffer (results keep buffering while the API wakes), a final-flush timeout (default 30 s, configurable), never throw, never change the exit code, and print one summary warning on failure.
8. Implement quarantine mode per the Q1 decision (if accepted).
9. README, plus example projects under `examples/` that CI runs against a local API.
10. Prepare for publishing (package.json `exports`, `files`, provenance). The npm publish itself happens at P10-S07.

## Expected Files / Areas

`packages/reporter/`, `packages/reporter/README.md`, `examples/playwright/`, `examples/vitest/`

## Testing & Verification

Unit tests for buffering, batching, retry/backoff, truncation, and CI detection. Integration tests that run the example Playwright and Vitest suites (including sharded and retried tests) against a local API and assert stored results. Chaos tests: API down, slow, returning 500/429 — the test run's exit code is unchanged.

## Acceptance Criteria

- [ ] Playwright and Vitest reporters stream results while tests run (visible before the run ends).
- [ ] Sharded runs appear as one TestPulse run.
- [ ] Retried-then-passed tests are reported as FLAKY with a retry count.
- [ ] API failures, timeouts, and quota errors never crash the runner or change its exit code.
- [ ] Metadata (branch, commit, CI provider, job URL) is auto-detected.
- [ ] The package builds, type-checks, and is ready to publish.

## Risks / Guardrails

Reporter crashing or hanging the test runner; unbounded memory on huge suites; incorrect shard/run correlation; leaking secrets from error output; depending on the unpublished `@testpulse/shared` at runtime.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 04 — Sprint 05: CI Reporter npm Package (Playwright + Vitest).
Act as: role-backend-engineer (load .agents/skills/role-backend-engineer/SKILL.md). Reviewers: role-sdet-architect, role-growth-engineer, role-security-engineer.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/04-phase-test-run-ingestion-data-model.md
4. planning/sprints/P04-S05-ci-reporter-npm-package.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P04_S05.md (positive, negative, boundary, multi-tenant scenarios). Start from this sprint's FR-* entries in docs/product/feature-catalog.md and their SC-* scenarios in docs/testing/scenario-catalog.md; reference those IDs and add any new SC-* IDs to the master scenario catalog.
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P04-S05.md and update task.md.
- Update the FR status in docs/product/feature-catalog.md and the "Automated by" column in docs/testing/scenario-catalog.md; automated tests carry their [SC-*] ID in the test title.
- Never suppress, skip, or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Test case catalog authored before implementation; tests added or updated for changed behavior.
- [ ] Every new endpoint, socket room, or job has tenant-isolation (404) and role (403) tests where applicable.
- [ ] `npm run lint`, `typecheck`, `test`, `build` and `npm audit --audit-level=high` pass (plus `test:contract` / `test:e2e` where applicable) — output observed, not assumed.
- [ ] Acceptance criteria verified.
- [ ] Feature catalog status and scenario catalog "Automated by" entries updated; tests carry `[SC-*]` IDs in their titles.
- [ ] Docs updated (`docs/api/` for contract changes; master plan if a canonical contract changed); walkthrough written.
- [ ] `task.md` updated; the sprint can be handed to the next sprint without hidden manual steps.
