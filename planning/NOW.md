# Now

Current focus for agent sessions. Keep it under ~40 lines; history lives in git and `task.md`.

## Now
- S-005 Shared RBAC permission map, member role/removal/self-leave API & `member.access_changed` event (`planning/slices/S-005-rbac-member-management.md`), branch `feat/s-005-rbac-member-management`.

## Next
- S-006 Invitations schema, API endpoints & Mailer (`P03-S04` part 2/3), then S-007 Web members & invitations UI (`P03-S04` part 3/3).

## Later
- Re-plan the remaining work by outcome at the end of Phase 03 (playbook Step 4), starting with
  M1 "first live run": sign up → project → API key → reporter → live run on staging.
  (S-001 orgs PR #13; S-002 projects PR #15; CI/audit PR #17; S-003 purge PR #18; S-004a switcher/dialogs PR #19; S-004b onboarding/project settings PR #20.)

## Owner actions outstanding
- Add repo secrets `STAGING_DIRECT_URL`, `RENDER_DEPLOY_HOOK_URL` and repo variable `STAGING_API_URL`
  (Deploy Staging fails until they exist, by design). Blocks playbook Step 5.
- Turn on "Do not allow bypassing the above settings" (enforce for admins) on the `main` protection rule.
- Tick Step 2 and G4, G5, G7 in `task.md` (PRs #11 and #12 merged with green checks); agents do not mark `[x]`.
- Choose and configure an email provider (G9) before real users touch staging.
