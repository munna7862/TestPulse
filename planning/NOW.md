# Now

Current focus for agent sessions. Keep it under ~40 lines; history lives in git and `task.md`.

## Now
- Step 2 of the delivery playbook (context diet, reviewer agents, hooks): `chore/step2-context-diet`.
- Independent review of H1 (PR #10) with the new reviewer agents.

## Next
- P03-S03 Organization & Project CRUD, written as a slice brief in `planning/slices/` first.

## Later
- Re-plan the remaining work by outcome at the end of Phase 03 (playbook Step 4), starting with
  M1 "first live run": sign up → project → API key → reporter → live run on staging.

## Owner actions outstanding
- Add repo secrets `STAGING_DIRECT_URL`, `RENDER_DEPLOY_HOOK_URL` and repo variable `STAGING_API_URL`
  (Deploy Staging fails until they exist, by design).
