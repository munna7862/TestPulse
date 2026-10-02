# Phase 05 — Sprint 03: Live Test Run Progress View

## Sprint Objective

Build the real-time test run progress component that shows results streaming in as tests complete.

## Dependencies

P05-S02 Socket.IO client.

## Personas

- **Lead:** `role-frontend-engineer`
- **Reviewers / sign-off:** `role-realtime-engineer`, `role-sdet-architect`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Create the LiveRunProgress view, driven by `run:started` / `run:progress` / `run:completed` events with REST as the source of truth on load.
2. Progress bar based on completed results / `expectedTestCount` (indeterminate when unknown), with live counters.
3. Virtualized result list with failures pinned to the top. It must handle 10,000+ results.
4. Expandable error details fetched on demand from the results detail endpoint (never carried in events), rendered as text with ANSI stripped.
5. Copy-to-clipboard for error messages and stack traces.
6. Elapsed-time timer.
7. Coalesce event-driven cache updates (once per animation frame). Use a subtle entry animation that respects `prefers-reduced-motion`.
8. Handle completion, including TIMED_OUT and CANCELLED, by transitioning to the static view.
9. Throttled `aria-live="polite"` summary updates for screen readers.

## Expected Files / Areas

`apps/web/src/features/runs/LiveRunProgress.tsx`, `apps/web/src/features/runs/`

## Testing & Verification

E2E: start a run with the example reporter project and verify results appear before the run completes. Performance: simulate a 10,000-result run and assert no long tasks over 200 ms. Component tests for the error details and completion states.

## Acceptance Criteria

- [ ] Results stream live into the progress view while the CI run is executing.
- [ ] The progress bar and counters update in real time.
- [ ] Failed tests show expandable, copyable error details loaded on demand.
- [ ] Run completion (including timeout) transitions smoothly to the static view.
- [ ] The UI stays responsive during a 10,000-result run.

## Risks / Guardrails

UI jank during rapid updates; memory growth on long runs; rendering untrusted error output unsafely; missing an error boundary around the live view.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 05 — Sprint 03: Live Test Run Progress View.
Act as: role-frontend-engineer (load .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-realtime-engineer, role-sdet-architect, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/05-phase-real-time-dashboard.md
4. planning/sprints/P05-S03-live-test-run-progress.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P05_S03.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P05-S03.md and update task.md.
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
