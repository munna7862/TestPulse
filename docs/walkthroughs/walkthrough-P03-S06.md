# P03-S06 walkthrough: Tenant isolation and browser security

## Feature purpose

P03-S06 protects organization and project routes, records security-sensitive actions, and applies consistent browser and rate-limit protections across deployments.

## Changed behavior

- S-009a added transactional audit events, tenant-scoped log fields, and a route classification check. [PR #27](https://github.com/munna7862/TestPulse/pull/27)
- S-009b adds API security headers, credentialed CORS for `WEB_ORIGIN`, and per-document CSP nonces and HSTS in the production web app.
- The web app forwards `/api` requests on the same origin, preserving first-party session cookies. The HTTPS forwarding request can carry a verified client address on Vercel. [ADR-008](../architecture/adr-008-verified-web-proxy.md)
- Redis shares OAuth and authenticated REST budgets with the existing rate-limit infrastructure. When Redis is unavailable, the API continues to serve health checks and authenticated REST, and OAuth, password auth, and invitation acceptance return `503`. Session revocation remains available after the REST budget is exhausted.

## Verification

1. Run `npm run verify` to check types, route isolation, security headers, log redaction, outage handling, and the production build.
2. Run `npm run test:contract` with `REDIS_URL` set. The Redis contract suites use independent connections to exercise the login, OAuth, invitation, authenticated REST, and ingestion budgets.
3. Run `npm run test:e2e` after the production build. The CSP test checks that two page loads use different nonces, and the forwarding test checks first-party cookies through login, refresh, and an authenticated request using a local upstream fixture.
4. Repeat the same-origin sign-in and refresh smoke check on staging after configuring the matching proxy secret on Vercel and Render and enabling the deployment workflow. [Free-tier runbook](../ops/free-tier-deployment.md)

The original six API acceptance checks and the first CSP browser check reproduced the intended missing behavior before implementation. A local HTTPS fixture also exercised the production forwarding route, including the verified address, credentials, request body, and response cookie. Live-host verification depends on staging configuration.
