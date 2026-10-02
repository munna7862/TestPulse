# Phase 06 — Sprint 03: Collaborative Annotations (Comments, Tags, Assignments)

## Sprint Objective

Implement real-time collaborative annotations on test cases: comments, tags, and assignee changes — synced live across team members.

## Dependencies

P06-S02 quarantine lifecycle.

## Scope

### Granular Implementation Tasks

1. Create Annotation Prisma model (id, testCaseId, authorId, type enum: COMMENT/TAG/ASSIGNMENT, content, createdAt).
2. Create POST /api/v1/test-cases/:testCaseId/annotations endpoint.
3. Create GET /api/v1/test-cases/:testCaseId/annotations endpoint (paginated).
4. Emit annotation events to WebSocket (project room broadcast).
5. Create AnnotationFeed component with real-time updates.
6. Implement @mention support in comments (notify mentioned user).
7. Add tag management (create, apply, remove tags on test cases).
8. Implement optimistic UI updates for annotation creation.

## Expected Files / Areas

`apps/api/src/modules/annotations/`, `apps/web/src/features/annotations/`

## Testing & Verification

Integration tests for annotation CRUD. E2E tests for real-time annotation sync between two browser sessions.

## Acceptance Criteria

- [ ] Users can add comments to test cases.
- [ ] Annotations sync in real-time to other connected users.
- [ ] Tags can be created and applied to test cases.
- [ ] @mentions notify the mentioned user.
- [ ] Annotation feed supports pagination.
- [ ] Optimistic UI provides instant feedback on creation.

## Risks / Guardrails

XSS in comment content; missing sanitization; optimistic update conflicts with server state.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06, Sprint 03: Collaborative Annotations (Comments, Tags, Assignments).

OBJECTIVE:
Implement real-time collaborative annotations on test cases: comments, tags, and assignee changes — synced live across team members.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create Annotation Prisma model (id, testCaseId, authorId, type enum: COMMENT/TAG/ASSIGNMENT, content, createdAt).
2. Create POST /api/v1/test-cases/:testCaseId/annotations endpoint.
3. Create GET /api/v1/test-cases/:testCaseId/annotations endpoint (paginated).
4. Emit annotation events to WebSocket (project room broadcast).
5. Create AnnotationFeed component with real-time updates.
6. Implement @mention support in comments (notify mentioned user).
7. Add tag management (create, apply, remove tags on test cases).
8. Implement optimistic UI updates for annotation creation.

TEST:
Integration tests for annotation CRUD. E2E tests for real-time annotation sync between two browser sessions.

ACCEPTANCE:
- [ ] Users can add comments to test cases.
- [ ] Annotations sync in real-time to other connected users.
- [ ] Tags can be created and applied to test cases.
- [ ] @mentions notify the mentioned user.
- [ ] Annotation feed supports pagination.
- [ ] Optimistic UI provides instant feedback on creation.

GUARDRAILS:
XSS in comment content; missing sanitization; optimistic update conflicts with server state.

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
