# Now

Current focus for agent sessions. Keep it under ~40 lines; history lives in git and `task.md`.

## Now
- S-007a Web members & invitations settings page (`planning/slices/S-007a-members-settings.md`), branch `feat/s-007a-members-settings`.

## Next
- S-007b Web accept-invitation page & safe `returnTo` (`P03-S04` part 3b/3), then P03-S05 API Keys.

## Later
- Re-plan the remaining work by outcome at the end of Phase 03 (playbook Step 4), starting with
  M1 "first live run": sign up → project → API key → reporter → live run on staging.
  (S-001 orgs PR #13; S-002 projects PR #15; CI/audit PR #17; S-003 purge PR #18; S-004a/b PRs #19/#20; S-005 RBAC/members PR #21; S-006 invitations API PR #22.)

## Owner actions outstanding
- Add repo secrets `STAGING_DIRECT_URL`, `RENDER_DEPLOY_HOOK_URL` and repo variable `STAGING_API_URL`
  (Deploy Staging fails until they exist, by design). Blocks playbook Step 5.
- Turn on "Do not allow bypassing the above settings" (enforce for admins) on the `main` protection rule.
- Tick Step 2 and G4, G5, G7 in `task.md` (PRs #11 and #12 merged with green checks); agents do not mark `[x]`.
- Choose and configure an email provider (G9) before real users touch staging.
