# Phase 07 — Sprint 03: Notification Preferences and Digest Batching

## Sprint Objective

Implement per-user, per-project notification preferences and digest batching for noisy projects.

## Dependencies

P07-S02 email notifications.

## Scope

### Granular Implementation Tasks

1. Create NotificationPreference model (userId, projectId, eventType, channels: in_app/email/none).
2. Create notification preferences UI page.
3. Implement preference-aware notification routing.
4. Implement digest batching (collect events over N minutes, send as single email).
5. Add project-level default notification settings (Admin configurable).
6. Create 'quiet hours' option (suppress non-critical notifications).
7. Add notification volume indicator per project.

## Expected Files / Areas

`apps/api/src/modules/notifications/preferences/`, `apps/web/src/features/settings/`

## Testing & Verification

Integration tests for preference-based routing. Tests for digest batching logic. E2E tests for preferences UI.

## Acceptance Criteria

- [ ] Users can configure notification preferences per project and event type.
- [ ] Preferences correctly route notifications to chosen channels.
- [ ] Digest batching groups events into a single email.
- [ ] Project-level defaults apply to new members.
- [ ] Quiet hours suppress non-critical notifications.
- [ ] Volume indicator helps users identify noisy projects.

## Risks / Guardrails

Digest batching delaying critical notifications; preference migration when new event types are added.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07, Sprint 03: Notification Preferences and Digest Batching.

OBJECTIVE:
Implement per-user, per-project notification preferences and digest batching for noisy projects.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create NotificationPreference model (userId, projectId, eventType, channels: in_app/email/none).
2. Create notification preferences UI page.
3. Implement preference-aware notification routing.
4. Implement digest batching (collect events over N minutes, send as single email).
5. Add project-level default notification settings (Admin configurable).
6. Create 'quiet hours' option (suppress non-critical notifications).
7. Add notification volume indicator per project.

TEST:
Integration tests for preference-based routing. Tests for digest batching logic. E2E tests for preferences UI.

ACCEPTANCE:
- [ ] Users can configure notification preferences per project and event type.
- [ ] Preferences correctly route notifications to chosen channels.
- [ ] Digest batching groups events into a single email.
- [ ] Project-level defaults apply to new members.
- [ ] Quiet hours suppress non-critical notifications.
- [ ] Volume indicator helps users identify noisy projects.

GUARDRAILS:
Digest batching delaying critical notifications; preference migration when new event types are added.

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
