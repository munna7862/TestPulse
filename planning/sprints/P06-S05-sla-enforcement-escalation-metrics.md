# Phase 06 — Sprint 05: SLA Enforcement, Escalation, and Quarantine Metrics

## Sprint Objective

Implement automated SLA enforcement with escalation notifications and quarantine health metrics.

## Dependencies

P06-S04 quarantine dashboard.

## Scope

### Granular Implementation Tasks

1. Create background job (BullMQ) for SLA monitoring (runs every hour).
2. At 80% of SLA elapsed: send warning notification to assignee.
3. At 100% of SLA elapsed: transition to Escalated, notify project admin.
4. At 200% of SLA elapsed: auto-flag for review in quarantine dashboard.
5. Compute quarantine metrics: MTTR (Mean Time to Resolution), open count, resolution rate.
6. Add quarantine health summary to project dashboard.
7. Implement configurable SLA duration per project (7, 14, 30, 60 days).

## Expected Files / Areas

`apps/api/src/jobs/sla-monitor.ts`, `apps/web/src/features/quarantine/`

## Testing & Verification

Integration tests for SLA monitoring job. Unit tests for MTTR calculation. E2E tests for escalation notifications.

## Acceptance Criteria

- [ ] SLA warning notification fires at 80% elapsed.
- [ ] SLA escalation transitions quarantine to Escalated at 100%.
- [ ] Quarantine metrics (MTTR, resolution rate) are computed correctly.
- [ ] Quarantine health summary appears on project dashboard.
- [ ] SLA duration is configurable per project.
- [ ] Background job runs reliably on schedule.

## Risks / Guardrails

SLA calculation timezone bugs; background job not running in production; notification spam from frequent SLA checks.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06, Sprint 05: SLA Enforcement, Escalation, and Quarantine Metrics.

OBJECTIVE:
Implement automated SLA enforcement with escalation notifications and quarantine health metrics.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create background job (BullMQ) for SLA monitoring (runs every hour).
2. At 80% of SLA elapsed: send warning notification to assignee.
3. At 100% of SLA elapsed: transition to Escalated, notify project admin.
4. At 200% of SLA elapsed: auto-flag for review in quarantine dashboard.
5. Compute quarantine metrics: MTTR (Mean Time to Resolution), open count, resolution rate.
6. Add quarantine health summary to project dashboard.
7. Implement configurable SLA duration per project (7, 14, 30, 60 days).

TEST:
Integration tests for SLA monitoring job. Unit tests for MTTR calculation. E2E tests for escalation notifications.

ACCEPTANCE:
- [ ] SLA warning notification fires at 80% elapsed.
- [ ] SLA escalation transitions quarantine to Escalated at 100%.
- [ ] Quarantine metrics (MTTR, resolution rate) are computed correctly.
- [ ] Quarantine health summary appears on project dashboard.
- [ ] SLA duration is configurable per project.
- [ ] Background job runs reliably on schedule.

GUARDRAILS:
SLA calculation timezone bugs; background job not running in production; notification spam from frequent SLA checks.

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
