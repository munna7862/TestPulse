# Phase 03 — Sprint 02: OAuth Integration (Google + GitHub)

## Sprint Objective

Add OAuth sign-in/sign-up via Google and GitHub providers using Auth.js or Passport.

## Dependencies

P03-S01 user registration.

## Scope

### Granular Implementation Tasks

1. Configure Google OAuth provider (client ID, secret, callback URL).
2. Configure GitHub OAuth provider (client ID, secret, callback URL).
3. Implement OAuth callback handler (create or link user account).
4. Handle account linking (same email from different providers).
5. Create OAuth consent screen configuration documentation.
6. Add social login buttons to the frontend auth pages.
7. Handle OAuth errors gracefully (denied, expired, mismatch).

## Expected Files / Areas

`apps/api/src/modules/auth/oauth/`, `apps/web/src/app/(auth)/`

## Testing & Verification

E2E tests for OAuth flow (mock provider in test). Integration tests for account creation and linking.

## Acceptance Criteria

- [ ] Google OAuth sign-in creates a user account.
- [ ] GitHub OAuth sign-in creates a user account.
- [ ] Same-email accounts are linked correctly.
- [ ] OAuth errors display user-friendly messages.
- [ ] Social login buttons render on auth pages.

## Risks / Guardrails

OAuth callback URL misconfiguration; account linking conflicts; exposed client secrets.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 03, Sprint 02: OAuth Integration (Google + GitHub).

OBJECTIVE:
Add OAuth sign-in/sign-up via Google and GitHub providers using Auth.js or Passport.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Configure Google OAuth provider (client ID, secret, callback URL).
2. Configure GitHub OAuth provider (client ID, secret, callback URL).
3. Implement OAuth callback handler (create or link user account).
4. Handle account linking (same email from different providers).
5. Create OAuth consent screen configuration documentation.
6. Add social login buttons to the frontend auth pages.
7. Handle OAuth errors gracefully (denied, expired, mismatch).

TEST:
E2E tests for OAuth flow (mock provider in test). Integration tests for account creation and linking.

ACCEPTANCE:
- [ ] Google OAuth sign-in creates a user account.
- [ ] GitHub OAuth sign-in creates a user account.
- [ ] Same-email accounts are linked correctly.
- [ ] OAuth errors display user-friendly messages.
- [ ] Social login buttons render on auth pages.

GUARDRAILS:
OAuth callback URL misconfiguration; account linking conflicts; exposed client secrets.

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
