# Now

Current focus for agent sessions. Keep it under ~40 lines; history lives in git and `task.md`.

## Now
- [S-010 tenant-scoped run storage](slices/S-010-tenant-scoped-run-storage.md) brief awaits owner approval. It is the first slice in the [M1 roadmap](roadmap.md).

## Next
- After approval, write and commit the PostgreSQL acceptance tests while they fail for the expected reasons, then implement S-010.

## Later
- Prove the first live run locally, then reproduce it on staging. S-009b merged in [PR #29](https://github.com/munna7862/TestPulse/pull/29).

## Owner actions outstanding
- Before hosted verification, configure `STAGING_DIRECT_URL`, `RENDER_DEPLOY_HOOK_URL`, and `STAGING_API_URL` for the Deploy Staging workflow.
- Turn on "Do not allow bypassing the above settings" (enforce for admins) on the `main` protection rule.
- Tick Step 2 and G4, G5, G7 in `task.md` (PRs #11 and #12 merged with green checks); agents do not mark `[x]`.
- Choose and configure an email provider (G9) before real users touch staging.
