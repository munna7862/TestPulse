# Free-Tier Deployment Runbook

> **Applies to:** Phases 02–10, up to P10-S05 (master plan §4.4, decision D-14).
> **Owner:** `role-devops-engineer`. **Last limits review:** 2026-10, based on the planning team's knowledge, not yet checked against provider pages.
> ⚠️ Free-tier terms change without notice. Re-check every number below against the provider's pricing page when executing P02-S05 and P10-S05, and update the table and date.

## 1. Topology

```text
Browser ──HTTPS──> Vercel Hobby (apps/web, Next.js)
   │                 └─ rewrite /api/:path*  ──HTTPS──>  Render free web service (apps/api)
   │                                                        ├─ Fastify REST
   └──WSS (ticket auth)──────────────────────────────────>  ├─ Socket.IO gateway (websocket transport)
                                                            └─ BullMQ workers (RUN_WORKERS_IN_PROCESS=true)
CI runner (@testpulse/reporter) ──HTTPS (API key)──────>  Render API URL directly
                                                                │            │
                                                     Neon free Postgres   Render Key Value (free)
```

## 2. Services and limits (verify before relying on them)

| Service | Plan | Limits to watch (approximate) | Impact on TestPulse | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| Vercel | Hobby | Non-commercial use only; bandwidth and function quotas | Fine while there are no paying users | Move to a commercial plan in P10-S06 |
| Render web service | Free | Sleeps after ~15 min without traffic; ~30–60 s cold start; ~750 instance-hours/month per workspace; no free background workers | Live sockets drop while asleep; the first CI/browser request is slow; scheduled jobs pause | In-process workers; catch-up-safe jobs; reporter cold-start tolerance; "waking up" UI; optional working-hours keep-alive ping |
| Render Key Value | Free | ~25 MB; **no persistence**; internal network only | Queues, schedules, rate-limit counters, and socket tickets can vanish on restart | Repeatable jobs re-registered at startup; jobs select work from Postgres state; tickets are short-lived anyway |
| Neon Postgres | Free | ~0.5 GB storage per project; compute autosuspends when idle | Staging data must stay small; the first query after idle is slower | Short staging retention; small seed; never use it for load tests |
| Sentry | Developer (free) | Monthly error quota | Noisy errors may exhaust the quota | Sample events in staging; fix noisy errors |
| Resend (optional) | Free | Daily/monthly email caps; without a verified domain, sends only to your own address | Staging emails reach team inboxes only | Use the console/file transport by default |
| GitHub Actions | Free | Unlimited minutes on public repos; a monthly minute quota on private ones | Long E2E suites consume minutes on private repos | Run E2E on PRs and main only; cache dependencies; cancel superseded runs |

## 3. One-time setup (performed in P02-S05)

Accounts are created by a **human**. Agents never sign up for services or enter credentials.

1. **Neon:** create the project `testpulse`, with a `staging` branch. Copy the pooled connection string (`DATABASE_URL`) and the direct one (`DIRECT_URL`) into the Render service and GitHub Actions secrets.
2. **Render:**
   - Create a Key Value instance (free) and copy its internal URL (`REDIS_URL`).
   - Create the web service from `render.yaml`:
     - Build: `npm ci && npx turbo run build --filter=@testpulse/api...`
     - Start: `node apps/api/dist/server.js`
     - Health check path: `/health`
     - Env: `NODE_ENV=production`, `DEPLOYMENT_PROFILE=free`, `RUN_WORKERS_IN_PROCESS=true`, `WEB_ORIGIN=https://<web>.vercel.app`, plus the secrets from `docs/ops/environment.md`.
3. **Vercel:** import the repository with root `apps/web`. Set `API_INTERNAL_URL=https://<api>.onrender.com` (the rewrite target) and `NEXT_PUBLIC_SOCKET_URL=https://<api>.onrender.com`.
4. **OAuth apps (Google, GitHub):** set the callback URLs to `https://<web>.vercel.app/api/v1/auth/oauth/<provider>/callback`. The callback goes through the same-origin proxy.
5. **GitHub Actions:** the `deploy-staging` workflow runs `prisma migrate deploy` against `DIRECT_URL`, then triggers the Render deploy hook. Vercel deploys through its Git integration.
6. **Sentry (deferred, not wired in code yet):** create projects `web` and `api`, and set `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`.

## 4. Configuration contract (same code, two profiles)

| Variable | Free profile | Paid profile |
| :--- | :--- | :--- |
| `DEPLOYMENT_PROFILE` | `free` | `paid` |
| `RUN_WORKERS_IN_PROCESS` | `true` | `false` (separate worker service) |
| Cookie domain (`COOKIE_DOMAIN`) | unset (host-only on the web origin, via the proxy) | `.<domain>` or host-only on `api.<domain>`, per ADR-005 |
| `API_INTERNAL_URL` (web rewrite target) | `https://<api>.onrender.com` | `https://api.<domain>` (or the rewrite is removed) |
| `NEXT_PUBLIC_SOCKET_URL` | `https://<api>.onrender.com` | `https://api.<domain>` |
| Socket transports | `["websocket"]` | `["websocket"]`, or polling with sticky sessions |
| `trustProxy` | the web host's proxy hops | the load balancer's hops |

## 5. Known behaviors during the free period (not bugs)

- **First request after idle is slow or returns 502/503/504.** The web app shows "waking up the server…" and retries; the reporter waits up to 60 s and buffers results.
- **Sockets disconnect when the service sleeps.** Clients reconnect with a new ticket and refetch state (SC-RT-007).
- **Scheduled jobs run late after sleep.** They catch up on wake; SLA markers are still set once each and in order (SC-QUA-011).
- **Redis restarts lose queues and schedules.** Jobs are re-registered at startup (SC-OPS-004). Domain events lost in a restart window are acceptable on staging; the paid profile uses persistent Redis.
- **Performance numbers on staging are not representative.** Measure §10 targets locally or in CI service containers (SC-PERF-*). Re-verify on paid infrastructure in P10-S06.

## 6. Optional keep-alive (check provider terms first)

A scheduled GitHub Actions workflow can call `GET /health` every ~10–14 minutes during working hours, to avoid cold starts during demos. One always-on service roughly fits a typical monthly free-hours allowance, but a second service would not. Do not use this to hide real performance problems.

## 7. Triggers to start P10-S06 (paid migration) early

Bring the decision forward if any of these happen:
- Any real user or design partner needs access, or anything is monetized (Vercel Hobby is non-commercial).
- The Neon storage cap or Render hours are regularly exhausted.
- Cold starts block a demo, a sales conversation, or E2E runs against staging.
- Data persistence is required (Redis or retention needs that free tiers can't meet).

## 8. Monthly check (5 minutes)

- [ ] Neon storage usage is below 80% of the cap.
- [ ] Render hours used this month are within the allowance.
- [ ] Sentry quota usage is below 80%.
- [ ] Staging still works: `/health` is 200; a login → live run smoke test passes.
- [ ] The provider pricing pages still match section 2 (update the date at the top).
