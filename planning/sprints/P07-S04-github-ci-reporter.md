# Phase 07 — Sprint 04: GitHub CI Reporter Plugin (PR Checks and Comments)

## Sprint Objective

Build a GitHub integration that posts test results as PR checks and summary comments.

## Dependencies

P07-S01 notification system.

## Scope

### Granular Implementation Tasks

1. Create GitHub App or OAuth integration for repository access.
2. Implement GitHub Check Run creation via Checks API.
3. Post test summary as PR comment (pass/fail counts, duration, flaky warnings).
4. Link PR comment to TestPulse dashboard for full details.
5. Support GitHub Actions token authentication (GITHUB_TOKEN).
6. Create configuration guide for GitHub integration setup.
7. Handle GitHub API rate limiting gracefully.

## Expected Files / Areas

`apps/api/src/modules/integrations/github/`, `docs/integrations/github.md`

## Testing & Verification

Integration tests for GitHub Check Run creation (mock API). E2E test for PR comment posting.

## Acceptance Criteria

- [ ] Test results appear as GitHub PR checks (pass/fail).
- [ ] Summary comment is posted on the PR with key metrics.
- [ ] Comment links back to TestPulse dashboard.
- [ ] GitHub Actions token authentication works.
- [ ] Rate limiting is handled gracefully.
- [ ] Setup documentation is clear and complete.

## Risks / Guardrails

GitHub API rate limits; comment duplication on re-runs; PR comment getting too long for large suites.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 07, Sprint 04: GitHub CI Reporter Plugin (PR Checks and Comments).

OBJECTIVE:
Build a GitHub integration that posts test results as PR checks and summary comments.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Create GitHub App or OAuth integration for repository access.
2. Implement GitHub Check Run creation via Checks API.
3. Post test summary as PR comment (pass/fail counts, duration, flaky warnings).
4. Link PR comment to TestPulse dashboard for full details.
5. Support GitHub Actions token authentication (GITHUB_TOKEN).
6. Create configuration guide for GitHub integration setup.
7. Handle GitHub API rate limiting gracefully.

TEST:
Integration tests for GitHub Check Run creation (mock API). E2E test for PR comment posting.

ACCEPTANCE:
- [ ] Test results appear as GitHub PR checks (pass/fail).
- [ ] Summary comment is posted on the PR with key metrics.
- [ ] Comment links back to TestPulse dashboard.
- [ ] GitHub Actions token authentication works.
- [ ] Rate limiting is handled gracefully.
- [ ] Setup documentation is clear and complete.

GUARDRAILS:
GitHub API rate limits; comment duplication on re-runs; PR comment getting too long for large suites.

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
