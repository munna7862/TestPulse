# Phase 01 — Sprint 02: UX Journeys and Information Architecture

## Sprint Objective

Design the information architecture, navigation structure, and key screen wireframes for TestPulse.

## Dependencies

P01-S01 product requirements.

## Personas

- **Lead:** `role-product-owner`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-growth-engineer`, `role-fullstack-architect`

## Scope

### Granular Implementation Tasks

1. Define the application navigation structure (sidebar, header with org/project switcher, breadcrumbs).
2. Create a route map for every application screen, consistent with the API nesting (org → project → resource).
3. Wireframe key screens: project dashboard, live run view, run list, test case detail, quarantine dashboard, notifications, project settings (general, API keys, members, webhooks, SLA/flaky settings).
4. Map the sign-up → first-live-run journey (target under 10 minutes) and design the onboarding checklist that mirrors it.
5. Design states for every key screen: loading, empty (with CTA), error, read-only (Viewer), over-quota / plan-limit, and live vs. completed run.
6. Document the notification center UX and the connection-status indicator.
7. Define responsive behavior: desktop-first, tablet-friendly, and mobile usable for read-only monitoring.

## Expected Files / Areas

`docs/ux/information-architecture.md`, `docs/ux/wireframes/`

## Testing & Verification

Review wireframes for usability, information hierarchy, and missing states. Walk the golden path step by step and estimate its time.

## Acceptance Criteria

- [ ] Navigation structure covers all MVP features.
- [ ] Key screen wireframes are documented, including settings screens.
- [ ] The sign-up to first-live-run journey has an onboarding checklist and an estimated time under 10 minutes.
- [ ] All application routes are mapped and consistent with API nesting.
- [ ] Loading, empty, error, read-only, and plan-limit states are designed for each key screen.

## Risks / Guardrails

Over-designing before implementation; missing edge-case screens (Viewer, over-quota, timed-out runs); ignoring tablet layouts.

## Antigravity Execution Prompt

```text
You are the documentation/design agent for TestPulse, Phase 01 — Sprint 02: UX Journeys and Information Architecture.
Act as: role-product-owner + role-frontend-engineer (load .agents/skills/role-product-owner/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-growth-engineer, role-fullstack-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts (§4–§8), Decision Log (§11), Open Decisions (§12)
3. planning/phases/01-phase-product-architecture-foundation.md
4. planning/sprints/P01-S02-ux-journeys-and-information-architecture.md — its Scope, Expected Files, Acceptance Criteria and Risks are the contract for this session.

BEFORE WRITING:
1. Confirm the sprint's dependencies are [x] in task.md; if not, stop and report.
2. Produce a short plan listing each deliverable and its path (paths must follow doc-implementation-standards).

EXECUTE every task under "Granular Implementation Tasks". Where a task resolves an item in master plan §12, record the decision as an ADR (or PRD section) and update master plan §11/§12 in the same change. Do not contradict the master plan silently — either align with it or propose an amendment explicitly.

AT COMPLETION:
- List the documents created/changed and how each acceptance criterion is satisfied.
- List any new open questions with the sprint that must close them.
- Update task.md.
```

## Sprint Definition of Done

- [ ] Every deliverable exists at the path listed in Expected Files / Areas.
- [ ] Content is consistent with the master plan; any change to a canonical contract is reflected in the master plan (§11 Decision Log / §12 Open Decisions).
- [ ] Open questions are listed with an owner sprint.
- [ ] New or changed requirements have `FR-*` IDs in `docs/product/feature-catalog.md`, with at least one `SC-*` scenario each.
- [ ] Reviewer personas have reviewed the deliverables against the acceptance criteria.
- [ ] `task.md` updated.
