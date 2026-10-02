# ADR-004: Dependency & Runtime Baseline

## Status
Accepted (P01-S03, 2026-10-02). Closes Open Decision Q2. Re-validate with `npm view <pkg> version` and a peer-dependency check at the start of P02-S01, and record any changes as an amendment here.

## Context
The original plan named Next.js 15, Prisma 5/6, Fastify v4/v5, and Node 20. Several of those have been superseded or are end-of-life. Starting a new product on superseded majors creates immediate upgrade debt, but taking `latest` blindly is also unsafe: on 2026-10-02 the npm `latest` tag for `prisma` pointed at a release candidate (`8.0.0-rc.19`), and TypeScript `latest` (7.0) was not yet supported by `typescript-eslint`.

## Decision

Versions observed on npm on 2026-10-02, and the major chosen:

| Area | Package(s) | Observed latest | **Chosen baseline** | Reason / constraint |
| :--- | :--- | :--- | :--- | :--- |
| Runtime | Node.js | — | **24 LTS** | Node 20 is EOL; Next 16 and Vitest 5 support 24 |
| Language | `typescript` | 7.0.2 | **6.0.x** | `typescript-eslint` 8.71 peer is `<6.1.0`; move to 7 when the lint stack supports it |
| Web framework | `next`, `react`, `react-dom` | 16.3.8 / 19.3.0 | **Next 16.x, React 19.x** | Current major (15.x only receives backports) |
| API framework | `fastify` | 5.12.5 | **5.x** | v4 is EOL |
| Validation | `zod` | 4.6.5 | **4.x** | Required by `fastify-type-provider-zod` 7 (`zod >= 4.1.5`) |
| Fastify + Zod | `fastify-type-provider-zod`, `@fastify/swagger` | 7.0.0 / 9.9.1 | **7.x / 9.x** | Peers: `fastify ^5.5`, `@fastify/swagger >= 9.5.1` |
| Fastify plugins | `@fastify/cookie`, `jwt`, `cors`, `helmet`, `rate-limit` | 11.1 / 10.2 / 11.3 / 13.1 / 11.2 | **current majors** | Fastify 5 line |
| ORM | `prisma`, `@prisma/client`, `@prisma/adapter-pg` | `prisma` latest = **8.0.0-rc.19** (prerelease); client 7.10.0 | **7.10.x (all three pinned to the same version)** | Never install `prisma@latest` while it points at an RC. Prisma 7 uses `prisma.config.ts` for CLI connections (use `DIRECT_URL`) and a driver adapter (`@prisma/adapter-pg`) with the pooled `DATABASE_URL` at runtime |
| Styling | `tailwindcss` | 4.3.3 | **4.x** | CSS-first `@theme` tokens |
| Real-time | `socket.io`, `socket.io-client`, `@socket.io/redis-adapter`, `@socket.io/redis-emitter` | 4.8.4 / 4.8.4 / 8.3.0 / 5.1.0 | **4.8.x / 8.x / 5.x** | ADR-002 |
| Queues | `bullmq` | 6.3.11 | **6.x** | BullMQ 6 takes the Redis client as an optional peer (`ioredis`, `redis`; also lists `pg`) |
| Redis client | `ioredis` | 6.0.0 | **5.11.x** | `ioredis-mock` 8 peers on `ioredis ^5`; BullMQ 6 accepts `>= 5`. Revisit when the mock supports 6 |
| Data fetching / state | `@tanstack/react-query`, `zustand`, `@tanstack/react-virtual` | 5.104 / 5.0 / 3.14 | **5.x / 5.x / 3.x** | |
| UI | Radix primitives, `lucide-react`, `recharts`, `motion` | 1.1.x / 1.49 / 3.10 / 13.5 | **current majors** | |
| Auth helpers | `argon2`, `arctic` (OAuth) | 0.45.1 / 3.7.0 | **0.45.x / 3.x** | ADR-005 |
| Email | `resend` | 6.32.0 | **6.x** | Behind the `Mailer` interface (closes Q5) |
| Observability | `@sentry/node`, `@sentry/nextjs` | 11.2.0 | **11.x** | |
| Unit/integration tests | `vitest`, `@vitest/coverage-v8` | 5.0.3 | **5.x** | Engines `^22.12 \|\| ^24` |
| E2E / a11y | `@playwright/test`, `@axe-core/playwright` | 1.63.0 / 4.13.0 | **1.6x / 4.x** | Next 16 peer `@playwright/test ^1.51.1` |
| Mocks / data | `msw`, `ioredis-mock`, `@faker-js/faker` | 3.0.1 / 8.13.1 / 10.6.0 | **3.x / 8.x / 10.x** | |
| Lint / format | `eslint`, `typescript-eslint`, `eslint-plugin-boundaries`, `prettier` | 10.11 / 8.71 / 7.2 / 3.9 | **ESLint 10 (flat config), ts-eslint 8.x, boundaries 7.x, Prettier 3.x** | |
| Build / repo | `turbo`, `tsup`, `husky`, `lint-staged`, `@commitlint/cli` | 2.11.6 / 8.5.1 / 9.1.7 / 17.6 / 21.2 | **current majors** | |

**Rules:**
1. Install with explicit major ranges (`^x.y.z`) recorded in `package.json`; `package-lock.json` is committed and `npm ci` is used in CI.
2. Never upgrade a major without a short amendment to this ADR (what changed, migration notes, and a green CI run).
3. Dependency updates are proposed by Dependabot (configured in P02-S05) and grouped weekly; security updates are applied immediately.
4. Framework renames in the chosen majors must be respected in the code and docs. For example, Next.js 16 renames `middleware.ts` to `proxy.ts`; wherever a sprint says "middleware" for the web app, use the Next 16 equivalent.

## Consequences
- **Positive:** the project starts on current majors; the known incompatibilities (TypeScript 7 with typescript-eslint, `ioredis` 6 with the mock, the Prisma RC on `latest`) are avoided up front.
- **Negative / trade-offs:** TypeScript 6 instead of 7 means a later upgrade; `ioredis` 5 means one later upgrade; documentation written for Next 15 and Prisma 5/6 patterns must be adapted.
- **Mitigation:** the amendment process above; Dependabot; P02-S01 re-checks peers before installing.
