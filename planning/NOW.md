# Now

Current focus for agent sessions. Keep it under ~40 lines; history lives in git and `task.md`.

## Now
- S-001 Organizations and tenant context (`planning/slices/S-001-organizations-and-tenant-context.md`),
  branch `feat/s-001-orgs-tenant-context`. First third of P03-S03.

## Next
- S-002 Project CRUD, plan project limit and the org purge job (rest of P03-S03 API).
- S-003 Web: org switcher, create org/project dialogs, onboarding to the first project.

## Later
- Re-plan the remaining work by outcome at the end of Phase 03 (playbook Step 4), starting with
  M1 "first live run": sign up → project → API key → reporter → live run on staging.

## Owner actions outstanding
- Add repo secrets `STAGING_DIRECT_URL`, `RENDER_DEPLOY_HOOK_URL` and repo variable `STAGING_API_URL`
  (Deploy Staging fails until they exist, by design).
- Choose and configure an email provider (G9) before real users touch staging.
