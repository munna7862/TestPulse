# Phase 06 — Sprint 03: Collaborative Annotations, Labels & Mentions

## Sprint Objective

Let team members discuss and label test cases in real time, with @mentions handed to the notification system.

## Dependencies

P06-S02 quarantine lifecycle.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`, `role-realtime-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Add the `Annotation` model (comments) per master plan §5, and user-applied `labels` on `TestCase`.
2. CRUD under `/api/v1/projects/:projectId/test-cases/:testCaseId/annotations`: create (Member+), paginated list, edit/delete own comments, and delete any comment (Admin+).
3. Comment body: plain text with restricted Markdown rendered through an allow-list sanitizer (no raw HTML), capped at 5,000 characters.
4. @mentions resolve only to members of the same org and enqueue the `annotation.mentioned` domain event (delivered as a notification in P07-S01).
5. Labels: add and remove labels on test cases (Member+); a project label list for autocomplete.
6. After commit, emit `annotation:created`. Other clients refetch the feed.
7. AnnotationFeed component with optimistic create and rollback on error.

## Expected Files / Areas

`apps/api/src/modules/annotations/`, `apps/web/src/features/annotations/`

## Testing & Verification

Integration tests for annotation CRUD, permissions, mention resolution (cross-org usernames ignored), and the domain event. XSS tests with malicious Markdown. E2E real-time sync between two browser sessions.

## Acceptance Criteria

- [ ] Members can comment on test cases; Viewers can read only.
- [ ] Comments sync in real time to other connected users.
- [ ] Labels can be applied and removed and are filterable in the test case list.
- [ ] @mentions of org members enqueue a mention domain event.
- [ ] Malicious content is neutralized when rendered.
- [ ] Optimistic UI gives instant feedback and rolls back on failure.

## Risks / Guardrails

XSS in comment content; mentions leaking user existence across orgs; optimistic update conflicts with server state.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 06 — Sprint 03: Collaborative Annotations, Labels & Mentions.
Act as: role-backend-engineer + role-frontend-engineer + role-realtime-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md, .agents/skills/role-realtime-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/06-phase-flaky-test-detection-quarantine.md
4. planning/sprints/P06-S03-collaborative-annotations.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P06_S03.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P06-S03.md and update task.md.
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
