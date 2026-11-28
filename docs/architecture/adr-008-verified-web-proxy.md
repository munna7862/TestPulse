# ADR-008: Verify the hosted web proxy's client address

## Status

Accepted for S-009b.

## Context

Browsers reach the API on the web origin in the free profile. At Render, the immediate caller for these requests is Vercel, so direct-request proxy settings group these users under Vercel's egress address. The public API also serves direct clients, including future CI reporters.

## Decision

The Next.js `/api` route handler forwards requests to the runtime `API_INTERNAL_URL`. On Vercel, with an HTTPS upstream and a configured `WEB_PROXY_SHARED_SECRET`, it sets the two reserved outbound headers from Vercel's validated `x-vercel-forwarded-for` address and the server-only credential. The handler strips incoming copies of both reserved headers and adds the credential only to the upstream request. It relays redirects to the browser for the browser to follow. Vercel sets the source address at its ingress. [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for)

Fastify checks the credential in constant time and validates a single IP address before using the assertion for per-IP rate limits. Otherwise it uses `request.ip` under the API host's `TRUST_PROXY` configuration. This credential authenticates the client-address handoff only. User sessions and project API keys continue to authorize requests. API logging redacts the credential.

## Consequences

- Each hosted web client gets an individual rate-limit bucket. Direct API requests use the load balancer's existing trust boundary.
- Vercel and Render must share the same secret through their environment settings. When the settings differ during rotation, the API uses the direct-request IP until both deployments agree.
- Browser session cookies stay on the web origin. Redis shares the request budgets across API instances.
