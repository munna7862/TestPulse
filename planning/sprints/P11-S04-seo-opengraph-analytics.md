# Phase 11 — Sprint 04: SEO, Open Graph, and Analytics Integration

## Sprint Objective

Optimize all public pages for search engines, configure social sharing, and integrate product analytics.

## Dependencies

P11-S03 CI integration guides.

## Scope

### Granular Implementation Tasks

1. Add meta titles and descriptions to all pages.
2. Configure Open Graph tags for social sharing (Twitter/X, LinkedIn).
3. Create OG image template for dynamic page previews.
4. Add structured data (JSON-LD) for product and organization.
5. Submit sitemap to Google Search Console.
6. Integrate product analytics (PostHog or Plausible).
7. Track key events: sign-up, org creation, API key generation, first run.
8. Create analytics dashboard for conversion funnel monitoring.

## Expected Files / Areas

`apps/web/src/app/layout.tsx`, `apps/web/public/`

## Testing & Verification

SEO audit (meta tags, headings, structured data). Social sharing preview test. Analytics event verification.

## Acceptance Criteria

- [ ] All pages have unique meta titles and descriptions.
- [ ] Open Graph tags generate proper social previews.
- [ ] Structured data is valid (Google Rich Results test).
- [ ] Sitemap is generated and submitted.
- [ ] Product analytics tracks key conversion events.
- [ ] Analytics dashboard shows funnel metrics.

## Risks / Guardrails

Missing meta tags on dynamic pages; OG image generation failing; analytics blocking page render.

## Antigravity Execution Prompt

```text
You are the implementation agent for TestPulse, Phase 11, Sprint 04: SEO, Open Graph, and Analytics Integration.

OBJECTIVE:
Optimize all public pages for search engines, configure social sharing, and integrate product analytics.

BEFORE CODING:
1. Inspect the repository and the relevant existing implementation.
2. Read AGENTS.md and the phase plan.
3. Produce a concise implementation plan artifact.
4. Identify exact files/modules that will change.
5. Do not modify unrelated areas.

IMPLEMENT:
1. Add meta titles and descriptions to all pages.
2. Configure Open Graph tags for social sharing (Twitter/X, LinkedIn).
3. Create OG image template for dynamic page previews.
4. Add structured data (JSON-LD) for product and organization.
5. Submit sitemap to Google Search Console.
6. Integrate product analytics (PostHog or Plausible).
7. Track key events: sign-up, org creation, API key generation, first run.
8. Create analytics dashboard for conversion funnel monitoring.

TEST:
SEO audit (meta tags, headings, structured data). Social sharing preview test. Analytics event verification.

ACCEPTANCE:
- [ ] All pages have unique meta titles and descriptions.
- [ ] Open Graph tags generate proper social previews.
- [ ] Structured data is valid (Google Rich Results test).
- [ ] Sitemap is generated and submitted.
- [ ] Product analytics tracks key conversion events.
- [ ] Analytics dashboard shows funnel metrics.

GUARDRAILS:
Missing meta tags on dynamic pages; OG image generation failing; analytics blocking page render.

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
