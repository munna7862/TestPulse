# ADR-003: Hosting — Free-Tier Profile During Development

## Status
Accepted (P01-S03, 2026-10). **Amendment required in P10-S06** for the paid production profile (closes Q3).

## Context
The product owner decided (D-14) that no money is spent on cloud resources until the product is feature-complete. The product still needs a hosted staging environment for OAuth callbacks, real CI runs against a public URL, demos, and end-to-end validation.

## Decision
Use the **free profile** described in master plan §4.4 and [`docs/ops/free-tier-deployment.md`](../ops/free-tier-deployment.md):

| Concern | Choice |
| :--- | :--- |
| Web | Vercel Hobby (Next.js); `/api/:path*` rewrite to the API so cookies are first-party |
| API + gateway + workers | One Render free web service; `RUN_WORKERS_IN_PROCESS=true` |
| PostgreSQL | Neon free (pooled URL at runtime; direct URL for migrations) |
| Redis | Render Key Value free (internal, non-persistent) |
| Email | Console/file transport; optionally Resend free (owner-only recipients without a verified domain) |
| Errors | Sentry free |
| CI/CD | GitHub Actions; Render deploy hook; Vercel Git integration |

Application code must work unchanged in the paid profile. The differences are configuration only: `DEPLOYMENT_PROFILE`, `RUN_WORKERS_IN_PROCESS`, cookie domain, API and socket URLs, and transports.

## Consequences
- **Positive:** $0 cloud cost; the architecture becomes resilient to sleep, cold starts, and Redis loss (catch-up-safe jobs, idempotency), which also hardens production.
- **Negative / trade-offs:** cold starts (~30–60 s); scheduled jobs pause while asleep; non-persistent Redis; small database; no commercial use (Vercel Hobby); hosted performance numbers are not representative.
- **Mitigation:** performance is verified locally/CI (master plan §10); the reporter tolerates cold starts; the UI has a "waking" state; there's an optional working-hours keep-alive; the paid migration is a planned sprint (P10-S06) with early triggers listed in the runbook.

## Alternatives considered
- **Railway:** good developer experience, but no free tier (trial credit only).
- **Fly.io:** no free allowance for new organizations.
- **Self-hosting on an always-free VM (e.g. Oracle Cloud):** always-on and generous, but requires managing a VM, TLS, Postgres, and Redis, which is operations work the team doesn't want during development. Reconsider in P10-S06 only if cost is the deciding factor.
- **Upstash Redis free:** a per-command quota that BullMQ polling would exhaust quickly.
