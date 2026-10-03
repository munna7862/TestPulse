# Now

Current focus for agent sessions. Keep it under ~40 lines; history lives in git and `task.md`.

## Now
- Playbook catch-up: reviewer baseline and per-slice §8 metrics (`planning/metrics.md`), branch
  `chore/playbook-metrics-baseline`.

## Next
- S-002 Projects (`planning/slices/S-002-projects.md`, approved with the recommended defaults).
- S-003 Purge job for soft-deleted orgs and projects. S-004 Web: org switcher, dialogs, onboarding.

## Later
- Re-plan the remaining work by outcome at the end of Phase 03 (playbook Step 4), starting with
  M1 "first live run": sign up → project → API key → reporter → live run on staging.

## Owner actions outstanding
- Add repo secrets `STAGING_DIRECT_URL`, `RENDER_DEPLOY_HOOK_URL` and repo variable `STAGING_API_URL`
  (Deploy Staging fails until they exist, by design). Blocks playbook Step 5.
- Turn on "Do not allow bypassing the above settings" (enforce for admins) on the `main` protection rule.
- Tick Step 2 and G4, G5, G7 in `task.md` (PRs #11 and #12 merged with green checks); agents do not mark `[x]`.
- Choose and configure an email provider (G9) before real users touch staging.
