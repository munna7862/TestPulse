# apps/web rules

Next.js 16 App Router (`proxy.ts` replaces `middleware.ts`), React 19, TanStack Query v5, Zustand, Tailwind v4,
Radix via `@testpulse/ui`. Root rules in `/AGENTS.md`.

- Never import `@testpulse/db`, Prisma, `ioredis`, `bullmq` or `pg`. All data goes through `apps/api` via the
  same-origin `/api` proxy (ESLint enforces this).
- Every new or changed screen has loading, empty and error states and passes axe in light and dark themes
  (Playwright, `npm run test:e2e`).
- Render test titles, error messages, stack traces and comments as text. Never use `dangerouslySetInnerHTML` for them.
- WebSocket events are lean: patch the React Query cache or refetch; do not trust event payloads as full state.
- Unit coverage here is low (~9% on 2026-10-02 vs the 40% target). New hooks and pure helpers come with unit tests.
