# S-009b: Protect browser sessions and share rate limits across API instances

Milestone: M1 First live run · Appetite: 1 session · Risk: high (browser rendering, proxy trust, Redis outages)
Replaces or covers: P03-S06 part 2/2, G8, `FR-SEC-03`, `FR-AUTH-09`, `FR-SEC-06` (existing CI gates)

## Outcome

Users can sign in and use TestPulse through its hosted web origin with a restrictive browser security policy. API instances enforce the same rate-limit budgets, and users behind the hosted web proxy get per-client limits.

## Acceptance criteria (EARS)

- **AC1** When the API serves JSON, it shall send Helmet security headers, including `X-Content-Type-Options` and `Referrer-Policy`. When a browser sends a valid preflight from `WEB_ORIGIN`, the API shall allow the configured origin with credentials. For foreign origins, it shall omit CORS allow headers. Requests without `Origin` shall remain usable by health checks and API clients (`SC-SEC-005`).
- **AC2** When the production web app serves an HTML document, it shall send a CSP with a fresh nonce that matches the document's Next.js scripts, block framing with `frame-ancestors 'none'`, and send HSTS. A browser test shall exercise hydration, client navigation, and same-origin sign-in under that policy (`SC-SEC-005`).
- **AC3** When password auth, OAuth, or invitation acceptance resolves a per-IP rate-limit key through the hosted web proxy, the API shall use the platform-derived client address only after verifying the web-to-API handoff. When that verification is absent or fails, the API shall resolve the key using its configured direct-request trust boundary. Request logs shall redact the verification credential (`SC-AUTH-017`, `SC-AUTH-025`, `SC-SEC-006`).
- **AC4** When requests for the same rate-limit identity hit two API instances, both shall enforce a shared Redis budget for the applicable password auth, OAuth, invitation acceptance, authenticated REST, and existing ingestion policies. If Redis is unavailable, OAuth and other fail-closed policies shall return `503`, and authenticated REST and ingestion shall continue with logging. Budget exhaustion shall preserve the documented `429` and `Retry-After` behavior (`SC-AUTH-017`, `SC-AUTH-025`, `SC-ORG-011`, `SC-ORG-013`, `SC-KEY-007`).

## Non-goals

Phase 04 owns ingestion endpoints and final ingestion limits. G9 owns email provider configuration. The first staging deployment follows the [operations runbook](../../docs/ops/free-tier-deployment.md).

## Contracts touched (read only these sections)

[Master plan §4.4](../master/TestPulse_Master_Plan.md#44-deployment-profiles), §7 and §10, [ADR-005](../../docs/architecture/adr-005-auth-and-sessions.md), [security model §§5–7](../../docs/security/security-model.md#5-rate-limiting), and the [P03-S06 test catalog](../../docs/testing/test_cases_catalog_P03_S06.md). Record any change to the canonical proxy contract in an ADR and update §4.4 in the same PR. Record verified configuration and behavior in the environment catalog, security model, and P03-S06 walkthrough.

## Risks to test explicitly

- Browser policy must allow hydration and first-party session cookies in a production build, including navigation from an auth page into the app.
- Proxy trust must preserve client separation on the hosted path and safe address selection for direct API callers.
- Two instances and a Redis outage must exercise the same production rate-limit wiring. Check policy-specific failure behavior and ensure health checks still work.

## Tests written first

- `apps/api/test/security/web-api-security.acceptance.test.ts` covers AC1 and AC3.
- `apps/api/test/security/shared-rate-limits.contract.test.ts` covers AC4 using two API instances and real Redis.
- `apps/web/e2e/security-headers.spec.ts` covers AC2 using the production build. Run `npm run test:e2e` for affected journeys.

## Done means

Acceptance evidence, `npm run verify`, the Redis contract suite, Playwright, dependency audit and Gitleaks (`SC-SEC-011`), independent claims/security/test reviews, staging smoke when available, and user merge after the required checks pass.
