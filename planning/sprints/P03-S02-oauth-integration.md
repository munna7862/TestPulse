# Phase 03 — Sprint 02: OAuth Integration (Google + GitHub)

## Sprint Objective

Add Google and GitHub sign-in handled by the API (Authorization Code + PKCE), with safe account creation and linking.

## Dependencies

P03-S01 user registration.

## Personas

- **Lead:** `role-backend-engineer`, `role-frontend-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-sdet-architect`

## Scope

### Granular Implementation Tasks

1. Implement Authorization Code + PKCE + `state` flows for Google and GitHub in apps/api (e.g. `@fastify/oauth2` or `arctic`). Auth.js/Passport are not used (D-01).
2. Add the `OAuthAccount` model per master plan §5.
3. Callback logic: sign in to an already-linked account; otherwise create a new user (provider-verified email → `emailVerifiedAt`); link to an existing local account **only** when both the provider email and the local email are verified. Otherwise ask the user to sign in with their existing method and link from settings.
4. For GitHub, fetch the verified primary email from `/user/emails`. Never trust an unverified email.
5. Issue the same session cookies as P03-S01 and redirect to the web app. No tokens in URLs.
6. Web: social sign-in buttons, a linked-accounts section in profile settings, and a friendly OAuth error page (denied, expired state, email conflict).
7. Document provider setup (local callback URLs, staging, production) in `docs/ops/oauth-setup.md`.

## Expected Files / Areas

`apps/api/src/modules/auth/oauth/`, `apps/web/src/app/(auth)/`, `docs/ops/oauth-setup.md`

## Testing & Verification

Integration tests with mocked provider endpoints (MSW) covering new user, returning user, safe link, and refused link (unverified email). E2E with a mocked provider. No real OAuth calls in CI.

## Acceptance Criteria

- [ ] Google and GitHub sign-in create or sign in to a user account.
- [ ] Same-email accounts are linked only under the verified-email rule.
- [ ] The state/PKCE check rejects forged callbacks.
- [ ] OAuth errors display user-friendly messages.
- [ ] Social login buttons render on the auth pages.

## Risks / Guardrails

OAuth callback URL misconfiguration; account pre-hijacking through unverified-email linking; exposed client secrets; open redirects via the post-login `returnTo` parameter (allow-list it).

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03 — Sprint 02: OAuth Integration (Google + GitHub).
Act as: role-backend-engineer + role-frontend-engineer (load .agents/skills/role-backend-engineer/SKILL.md, .agents/skills/role-frontend-engineer/SKILL.md). Reviewers: role-security-engineer, role-sdet-architect.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/03-phase-authentication-multi-tenancy.md
4. planning/sprints/P03-S02-oauth-integration.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P03_S02.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P03-S02.md and update task.md.
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
