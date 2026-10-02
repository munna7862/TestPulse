## Summary

<!-- What changed and why, in 2–4 sentences. -->

## Sprint & traceability

- **Sprint:** PXX-SYY — <!-- title, link to planning/sprints/... -->
- **Features (FR):** <!-- e.g. FR-ING-03, FR-ING-04 — see docs/product/feature-catalog.md -->
- **Scenarios (SC) covered:** <!-- e.g. SC-ING-004, SC-ING-005 — see docs/testing/scenario-catalog.md -->
- **New scenarios added to the master catalog:** <!-- IDs or "none" -->

## Verification (paste real output summaries)

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test` — <!-- N passed / 0 failed, duration -->
- [ ] `npm run test:contract` (if queues or real-time changed)
- [ ] `npm run test:e2e` (if UI or user journeys changed)
- [ ] `npm run build`
- [ ] `npm audit --audit-level=high`

## Checklist

- [ ] Tenant isolation: new endpoints, rooms, and jobs have cross-tenant (404) and role (403) tests
- [ ] Zod schemas in `@testpulse/shared` for every new boundary
- [ ] Works in the free deployment profile (same-origin `/api`, ticket sockets, in-process workers, catch-up-safe jobs)
- [ ] UI: loading, empty, and error states; axe-core clean in light and dark
- [ ] Feature catalog status and scenario "Automated by" columns updated
- [ ] Docs updated (`docs/api/`, master plan if a canonical contract changed, ADR if needed)
- [ ] Walkthrough written (`docs/walkthroughs/walkthrough-PXX-SYY.md`) and `task.md` updated

## Notes for reviewers

<!-- Risks, trade-offs, follow-ups, screenshots. -->
