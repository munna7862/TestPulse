# Phase 07 — Sprint 01: In-App Notification Center and Real-Time Delivery

## Sprint Objective

Build the in-app notification center with real-time delivery via WebSocket, unread count badge, and notification list.

## Dependencies

Phase 06 complete (quarantine and annotations).

## Scope

### Granular Implementation Tasks

1. Create Notification Prisma model (id, userId, type, title, body, metadata, read, createdAt).
2. Create notification service for creating and delivering notifications.
3. Deliver notifications via WebSocket (user-specific room).
4. Create NotificationCenter UI component (bell icon with unread count).
5. Create notification dropdown with scrollable list.
6. Implement mark-as-read (individual and mark-all).
7. Create GET /api/v1/notifications endpoint (paginated, filterable).
8. Add notification click-through (link to relevant resource).

## Expected Files / Areas

`apps/api/src/modules/notifications/`, `apps/web/src/features/notifications/`

## Testing & Verification

Integration tests for notification creation and delivery. E2E tests for notification center UI and mark-as-read.

## Acceptance Criteria

- [ ] Notifications are delivered in real-time via WebSocket.
- [ ] Unread count badge updates dynamically.
- [ ] Notification list is paginated and scrollable.
- [ ] Mark-as-read works for individual and bulk.
- [ ] Notification click-through navigates to the relevant page.
- [ ] Notification types cover all defined events.

## Risks / Guardrails

Notification flooding from noisy projects; WebSocket room leaking notifications across users; missing cleanup for old notifications.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07, Sprint 01: In-App Notification Center and Real-Time Delivery.

OBJECTIVE:
Build the in-app notification center with real-time delivery via WebSocket, unread count badge, and notification list.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create Notification Prisma model (id, userId, type, title, body, metadata, read, createdAt).
2. Create notification service for creating and delivering notifications.
3. Deliver notifications via WebSocket (user-specific room).
4. Create NotificationCenter UI component (bell icon with unread count).
5. Create notification dropdown with scrollable list.
6. Implement mark-as-read (individual and mark-all).
7. Create GET /api/v1/notifications endpoint (paginated, filterable).
8. Add notification click-through (link to relevant resource).

TEST:
Integration tests for notification creation and delivery. E2E tests for notification center UI and mark-as-read.

ACCEPTANCE:
- [ ] Notifications are delivered in real-time via WebSocket.
- [ ] Unread count badge updates dynamically.
- [ ] Notification list is paginated and scrollable.
- [ ] Mark-as-read works for individual and bulk.
- [ ] Notification click-through navigates to the relevant page.
- [ ] Notification types cover all defined events.

GUARDRAILS:
Notification flooding from noisy projects; WebSocket room leaking notifications across users; missing cleanup for old notifications.

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
