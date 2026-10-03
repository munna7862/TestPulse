# Environment Variable Catalog

> **Sprint:** P01-S03 (draft) → finalized in P02-S05. Every variable is validated at startup with Zod (`packages/shared/src/env/*` schemas, with server-only schemas living in each app). Missing or invalid values fail fast with a readable message.
> **Never commit real values.** `.env.example` files contain placeholders only. Local `.env` files are git-ignored.

Legend: **W** = apps/web, **A** = apps/api (server and in-process workers), **T** = tests/CI, **S** = secret.

## Core

| Variable | Used by | Example / default | Notes |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | W A | `development` | |
| `DEPLOYMENT_PROFILE` | W A | `free` | `free` \| `paid` (master plan §4.4) |
| `DATABASE_URL` (S) | A | `postgresql://…-pooler…/testpulse?sslmode=require` | Pooled; runtime client via `@prisma/adapter-pg` |
| `DIRECT_URL` (S) | A T | `postgresql://…/testpulse?sslmode=require` | Direct; used by `prisma.config.ts` for migrations |
| `DATABASE_URL_TEST` (S) | T | `postgresql://postgres:postgres@localhost:5432/testpulse_test` | Schema-per-worker test harness |
| `REDIS_URL` (S) | A T | `redis://localhost:6379` | Optional locally (unit tests use `ioredis-mock`); required for `test:contract` |
| `RUN_WORKERS_IN_PROCESS` | A | `true` (free) | Start BullMQ workers inside the API process |
| `PORT` | A | `4000` | Render injects it |
| `LOG_LEVEL` | A | `info` | pino |

## URLs & origins

| Variable | Used by | Example | Notes |
| :--- | :--- | :--- | :--- |
| `WEB_ORIGIN` | A | `https://testpulse-staging.vercel.app` | CORS and CSRF allow-list; OAuth redirects |
| `API_PUBLIC_URL` | A | `https://testpulse-api.onrender.com` | Used in dashboard links for the reporter and GitHub summaries |
| `API_INTERNAL_URL` | W | `https://testpulse-api.onrender.com` | Target of the `/api/:path*` rewrite |
| `NEXT_PUBLIC_SOCKET_URL` | W | `https://testpulse-api.onrender.com` | Direct WebSocket endpoint (ticket auth) |
| `NEXT_PUBLIC_APP_URL` | W | `https://testpulse-staging.vercel.app` | Canonical URLs, OG tags |
| `TRUST_PROXY` | A | `true` | Fastify `trustProxy` for correct client IPs behind the proxies |

## Auth & secrets

| Variable | Used by | Notes |
| :--- | :--- | :--- |
| `JWT_ACCESS_SECRET` (S) | A | ≥ 32 random bytes; rotate in P10-S06 |
| `JWT_REFRESH_SECRET` (S) | A | ≥ 32 random bytes (refresh tokens are opaque and stored hashed; this secret pepper-hashes them) |
| `COOKIE_DOMAIN` | A | Unset in the free profile (host-only). Paid profile per ADR-005 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (S) | A | OAuth; both required to enable Google. Setup: [oauth-setup.md](oauth-setup.md) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (S) | A | OAuth; both required to enable GitHub |
| `OAUTH_REDIRECT_BASE_URL` | A | Optional. Origin used to build provider callback URLs; defaults to `WEB_ORIGIN` (same-origin `/api` proxy) |
| `OAUTH_PROVIDER_TIMEOUT_MS` | A | Default `10000`. Bound for each outbound provider call |
| `OAUTH_RATE_LIMIT_PER_MINUTE` | A | Default `30`. Per-IP limit for OAuth start/callback |
| `AUTH_RATE_LIMIT_LOGIN_PER_MINUTE` | A | Default `10`. Password logins per IP per minute (security model §5) |
| `AUTH_RATE_LIMIT_LOGIN_PER_EMAIL_PER_15_MIN` | A | Default `5`. Password logins per account per 15 minutes, from any IP |
| `AUTH_RATE_LIMIT_RECOVERY_PER_HOUR` | A | Default `20`. Register, resend, forgot/reset and verify-email requests per IP per hour |
| `AUTH_RATE_LIMIT_RECOVERY_PER_EMAIL_PER_HOUR` | A | Default `5`. Register, resend and forgot requests per email per hour |
| `AUTH_GENERIC_RESPONSE_MIN_MS` | A | Default `250` (`0` when `NODE_ENV=test`). Minimum time for register/resend/forgot responses so timing cannot reveal accounts (ADR-005 §9) |
| `TRUST_PROXY` (note) | A | Auth rate limits key on `request.ip`; X-Forwarded-For counts only when this is set to the real proxy hops. Counters live in Redis when `REDIS_URL` is set, and auth routes return 503 if Redis is unreachable |
| `WEBHOOK_SECRET_ENCRYPTION_KEY` (S) | A | 32-byte base64 key for AES-256-GCM |
| `UNSUBSCRIBE_SIGNING_SECRET` (S) | A | HMAC for unsubscribe links |

## Email

| Variable | Used by | Notes |
| :--- | :--- | :--- |
| `MAIL_TRANSPORT` | A | `console` (default in dev/test) \| `file` \| `resend` \| `smtp` |
| `MAIL_FROM` | A | e.g. `TestPulse <noreply@…>` |
| `RESEND_API_KEY` (S) | A | When `MAIL_TRANSPORT=resend` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (S) | A | When `MAIL_TRANSPORT=smtp` |

## Observability

| Variable | Used by | Notes |
| :--- | :--- | :--- |
| `SENTRY_DSN` (S) | A | Not read yet: error tracking is deferred until the first real staging deploy (see `task.md`) |
| `NEXT_PUBLIC_SENTRY_DSN` | W | Public by design |
| `SENTRY_ENVIRONMENT` | W A | `local` \| `ci` \| `staging` \| `production` |
| `GIT_COMMIT_SHA` | W A | Release tagging; shown short in `/health` |

## Reporter (customer CI, documented in P04-S05)

| Variable | Notes |
| :--- | :--- |
| `TESTPULSE_API_KEY` | Required; store as a CI secret |
| `TESTPULSE_API_URL` | Defaults to the public API URL |
| `TESTPULSE_RUN_ID` | Overrides the detected `externalRunId` |
| `TESTPULSE_DISABLED` | `1` disables the reporter |
| `TESTPULSE_QUARANTINE_MODE` | `advisory` (default) \| `non-blocking` (Playwright) |
