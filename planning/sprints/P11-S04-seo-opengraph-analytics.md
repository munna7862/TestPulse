# Phase 11 — Sprint 04: SEO, Open Graph, and Analytics Integration

## Sprint Objective

Optimize all public pages for search engines, configure social sharing, and integrate product analytics.

## Dependencies

P11-S03 CI integration guides.

## Personas

- **Lead:** `role-growth-engineer`
- **Reviewers / sign-off:** `role-security-engineer`, `role-product-owner`

## Scope

### Granular Implementation Tasks

1. Add unique meta titles and descriptions to all public pages; mark the authenticated app `noindex`.
2. Configure Open Graph and Twitter/X card tags for social sharing.
3. Create an OG image template for dynamic previews (docs pages, blog).
4. Add JSON-LD structured data (SoftwareApplication, Organization).
5. Generate `sitemap.xml` and `robots.txt`. Submitting to Google Search Console requires a human with account access.
6. Integrate privacy-first product analytics (PostHog or Plausible), loaded after consent where required and never blocking render.
7. Track the funnel events from the growth skill taxonomy (no PII); `first_run_received` is emitted server-side.
8. Build a funnel dashboard that measures TTFV (sign-up → first run).

## Expected Files / Areas

`apps/web/src/app/layout.tsx`, `apps/web/public/`

## Testing & Verification

SEO audit (meta tags, headings, structured data). Social sharing preview test. Analytics event verification.

## Acceptance Criteria

- [ ] All public pages have unique meta titles and descriptions; app pages are not indexed.
- [ ] Open Graph tags generate proper social previews.
- [ ] Structured data is valid (Google Rich Results test).
- [ ] The sitemap is generated and ready for submission.
- [ ] Product analytics tracks the funnel events without PII and respects consent.
- [ ] The funnel dashboard shows TTFV.

## Risks / Guardrails

Missing meta tags on dynamic pages; OG image generation failing; analytics blocking page render.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 11 — Sprint 04: SEO, Open Graph, and Analytics Integration.
Act as: role-growth-engineer (load .agents/skills/role-growth-engineer/SKILL.md). Reviewers: role-security-engineer, role-product-owner.

READ FIRST:
1. AGENTS.md
2. planning/master/TestPulse_Master_Plan.md — canonical contracts: §4.2 ingestion, §5 domain model, §6 events, §7 RBAC/isolation, §8 plan limits, §10 targets
3. planning/phases/11-phase-landing-page-docs-gtm.md
4. planning/sprints/P11-S04-seo-opengraph-analytics.md — its Scope, Acceptance Criteria and Risks are the contract for this session.

BEFORE CODING:
1. Confirm the sprint's dependencies are [x] in task.md and any open decisions it relies on (master plan §12) are closed; if not, stop and report.
2. Inspect the existing implementation and produce a concise implementation plan artifact naming the exact files/modules that will change.
3. Author docs/testing/test_cases_catalog_P11_S04.md (positive, negative, boundary, multi-tenant scenarios).
4. Do not modify unrelated areas. If this file conflicts with the master plan, follow the master plan and report the conflict.

IMPLEMENT every task under "Granular Implementation Tasks".

VERIFY by running: npm run lint; npm run typecheck; npm run test; npm run build; npm audit --audit-level=high; npm run test:e2e (with axe-core checks on new/changed pages) — plus npm run test:contract if queues or real-time code changed.

AT COMPLETION:
- Report changed files, tests executed (counts, duration, file paths) and results, and known limitations.
- Write docs/walkthroughs/walkthrough-P11-S04.md and update task.md.
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
