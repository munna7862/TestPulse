# Phase 08 — Sprint 04: MTTR Metrics, Branch Comparison, and Data Export

## Sprint Objective

Build advanced analytics: Mean Time to Resolution for quarantines, branch-to-branch comparison, and data export capabilities.

## Dependencies

P08-S03 leaderboard views.

## Scope

### Granular Implementation Tasks

1. Compute MTTR (Mean Time to Resolution) for quarantined tests.
2. Create MTTR trend chart (is quarantine resolution getting faster?).
3. Build branch comparison view (compare pass rate, duration, failures between two branches).
4. Implement CSV export for all analytics views.
5. Implement JSON API export for programmatic access.
6. Create shareable dashboard links (read-only, time-limited).
7. Add analytics summary to notification digests.

## Expected Files / Areas

`apps/api/src/modules/analytics/`, `apps/web/src/features/analytics/`

## Testing & Verification

Unit tests for MTTR calculation. Integration tests for branch comparison. E2E tests for CSV/JSON export.

## Acceptance Criteria

- [ ] MTTR is computed correctly for quarantined tests.
- [ ] MTTR trend shows improvement over time.
- [ ] Branch comparison highlights differences clearly.
- [ ] CSV export contains all relevant data.
- [ ] JSON API export is documented and usable.
- [ ] Shareable links provide read-only access.

## Risks / Guardrails

MTTR skewed by outlier quarantines; branch comparison misleading with different test counts; export timeout on large datasets.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 08, Sprint 04: MTTR Metrics, Branch Comparison, and Data Export.

OBJECTIVE:
Build advanced analytics: Mean Time to Resolution for quarantines, branch-to-branch comparison, and data export capabilities.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Compute MTTR (Mean Time to Resolution) for quarantined tests.
2. Create MTTR trend chart (is quarantine resolution getting faster?).
3. Build branch comparison view (compare pass rate, duration, failures between two branches).
4. Implement CSV export for all analytics views.
5. Implement JSON API export for programmatic access.
6. Create shareable dashboard links (read-only, time-limited).
7. Add analytics summary to notification digests.

TEST:
Unit tests for MTTR calculation. Integration tests for branch comparison. E2E tests for CSV/JSON export.

ACCEPTANCE:
- [ ] MTTR is computed correctly for quarantined tests.
- [ ] MTTR trend shows improvement over time.
- [ ] Branch comparison highlights differences clearly.
- [ ] CSV export contains all relevant data.
- [ ] JSON API export is documented and usable.
- [ ] Shareable links provide read-only access.

GUARDRAILS:
MTTR skewed by outlier quarantines; branch comparison misleading with different test counts; export timeout on large datasets.

At completion:
- Run the relevant verification commands.
- Report changed files.
- Report tests executed and results.
- Report known limitations.
- Do not suppress or bypass failing tests.
```

## Sprint Definition of Done

- [ ] Scope implemented without unrelated changes.
- [ ] Tests added or updated for changed behavior.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Relevant tests pass.
- [ ] Build passes when applicable.
- [ ] Acceptance criteria verified.
- [ ] Git diff reviewed.
- [ ] Documentation updated when behavior or architecture changed.
- [ ] Sprint can be handed to the next sprint without hidden manual steps.
