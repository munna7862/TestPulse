# Phase 11 — Landing Page, Documentation & Go-to-Market

← [Phase 10](./10-phase-quality-engineering-release.md) | ✅ End of v1 Roadmap

## Objective

Build the public-facing assets that convert visitors into users: a stunning landing page, comprehensive documentation, and go-to-market materials.

## Outcome

A potential customer can discover TestPulse, understand its value proposition in 30 seconds, sign up, and integrate with their CI pipeline — all self-serve.

## Scope

- Landing page (hero, features, pricing, testimonials placeholder, CTA)
- Documentation site (getting started, API reference, CI integration guides)
- Getting started guide (sign up -> API key -> first live run in under 10 minutes)
- CI integration guides (GitHub Actions, GitLab CI, Jenkins)
- API reference documentation (OpenAPI generated from Zod route schemas via `@fastify/swagger`)
- SEO optimization (meta tags, Open Graph, structured data)
- Social media assets (Twitter/X card, LinkedIn banner, Product Hunt assets)
- Public launch: remove the private-beta gate, Product Hunt / Show HN
- Privacy-first analytics integration (PostHog or Plausible; no PII; consent-aware)
- Feedback collection mechanism (in-app feedback widget)

## Landing Page Sections

```text
1. Hero             — "See your tests. In real time." + CTA
2. Problem          — The pain of broken CI pipelines and flaky tests
3. Solution         — Live dashboard, collaborative annotations, quarantine
4. Features         — Real-time streaming, flaky detection, team collaboration
5. How it works     — 3-step visual (sign up -> integrate -> observe)
6. Pricing          — Free / Pro / Enterprise quota table (from shared plan limits; Pro = contact/waitlist)
7. Social proof     — Testimonials / logos (placeholder initially)
8. CTA              — "Start for free" button
9. Footer           — Links, legal, social
```

## Testing

- Lighthouse Performance / Accessibility / SEO ≥ 95 (master plan §10)
- SEO audit (title tags, meta descriptions, heading hierarchy)
- Responsive layout tests (mobile, tablet, desktop)
- Link verification (no broken links)
- Sign-up conversion funnel E2E test

## Acceptance Criteria

- [ ] Landing page meets master plan §10 (LCP < 1.5 s; Lighthouse ≥ 95).
- [ ] Documentation covers sign-up to first test run.
- [ ] CI integration guides work for GitHub Actions.
- [ ] API reference is auto-generated and complete.
- [ ] SEO meta tags and Open Graph tags are implemented.
- [ ] Public sign-up is open, and the Product Hunt / Show HN launch is executed with monitoring in place.

## Exit Criteria

A developer who has never heard of TestPulse can:
1. Land on the homepage.
2. Understand the value proposition in 30 seconds.
3. Sign up and integrate within 10 minutes.
4. See their first live test run on the dashboard.

## Sprint Decomposition

- P11-S01: Landing page design and implementation
- P11-S02: Documentation site setup and getting started guide
- P11-S03: CI integration guides and API reference
- P11-S04: SEO, Open Graph, and analytics integration
- P11-S05: Public launch (Product Hunt & GTM execution)
