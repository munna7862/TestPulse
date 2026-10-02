---
name: dev-coding-standards
description: TestPulse production coding standards for TypeScript, React, Fastify, Prisma, Zod, and architecture boundaries.
---

# Universal Dev Coding Standards for TestPulse

When writing production code for **TestPulse**, the following standards must be applied to guarantee application performance, strict type safety, clean architecture, and maintainability across **TypeScript (Next.js 16 / Fastify 5)**. Exact versions are pinned in [ADR-004](../../../docs/architecture/adr-004-dependency-baseline.md).

---

### 1. Strict Typing & Boundary Schema Validation

- **Zero Untyped Data (`any` strictly prohibited):**
  - Run in `strict: true` mode with `noUncheckedIndexedAccess`. The `any` type is forbidden (enforced by `@typescript-eslint/no-explicit-any` and `no-unsafe-*` rules); use `unknown` with explicit narrowing or Zod validation.
  - Never use `as unknown as Type`, `@ts-ignore`, or non-null assertions to bypass type checking. `@ts-expect-error` requires a comment explaining why.
- **Runtime Schema Validation at Boundaries:**
  - Validate all data crossing external boundaries (HTTP request body, query params, headers, WebSocket payloads, background job data, environment variables) using **Zod**.
  - Keep shared Zod schemas in `packages/shared/src/schemas/` so they can be consumed by both `apps/web` and `apps/api`.
  - Infer TypeScript types directly from Zod schemas:

```typescript
import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(50),
  description: z.string().max(255).optional(),
});

export type CreateProjectPayload = z.infer<typeof CreateProjectSchema>;
```

- **Standardized API Response Envelope:**
  All API responses follow a consistent envelope. Define it as a Zod schema factory in `@testpulse/shared` so responses are validated and documented, too. Error `code`s come from a shared enum (e.g. `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `QUOTA_EXCEEDED`, `PLAN_LIMIT_REACHED`). List endpoints use cursor pagination (`meta.cursor` = opaque next cursor, `meta.limit` ≤ 100).

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    cursor?: string;
  };
}
```

---

### 2. Monorepo Package Boundaries & Dependency Discipline

- **Dependency Rules:**
  - `apps/web` can import from `@testpulse/shared` and `@testpulse/ui`.
  - `apps/api` can import from `@testpulse/shared` and `@testpulse/db`.
  - `@testpulse/shared` must NOT import from `apps/*`, `@testpulse/db`, or `@testpulse/ui`.
  - `@testpulse/db` must NOT import from `apps/*` or `@testpulse/ui`.
  - `@testpulse/ui` must NOT import from `apps/*` or `@testpulse/db`.
  - `@testpulse/shared` must stay browser-safe (no `ioredis`, Prisma, `fs`, or other Node built-ins). Server-only helpers live in `apps/api/src/lib/`.
  - `@testpulse/reporter` bundles anything it uses from `@testpulse/shared`. Its runtime dependencies are limited to runner peer deps.
  - Enforce these rules with ESLint (`no-restricted-imports` / `eslint-plugin-boundaries`), and ban `@prisma/client` imports outside `packages/db`.
- **Database Access:**
  - The frontend (`apps/web`) must NEVER import `@testpulse/db` or access the database directly. All database access must be routed through Fastify API (`apps/api`).
- **Internal Package Namespace:**
  - Always use workspace package names: `@testpulse/shared`, `@testpulse/db`, `@testpulse/ui`, `@testpulse/reporter`.

---

### 3. API & Backend Standards (Fastify + Prisma)

- **Tenant Scoping:** Every query accessing tenant data goes through `createTenantDb(request.tenantContext)` and is scoped by `orgId` and/or `projectId` (master plan §7). Look up records by `{ id, projectId }` with `findFirst`, never by `id` alone. Cross-tenant → 404; insufficient role → 403.
- **Zod Type Provider:** Register `fastify-type-provider-zod` (`validatorCompiler` + `serializerCompiler`) and declare `body`, `querystring`, `params`, and `response` schemas on every route, so validation, typing, and OpenAPI come from one source.
- **Stateless Services:** API, gateway, and worker processes stay stateless for horizontal scaling. Session and queue state belong in PostgreSQL or Redis.
- **Error Handling:** Never expose raw database errors or stack traces to clients. Map Prisma (`P2002` → 409, `P2025` → 404) and internal errors to the shared error codes in a single Fastify `setErrorHandler`.
- **Async Safety:** Always await promises or handle rejections (`@typescript-eslint/no-floating-promises`). Fire-and-forget work belongs in a BullMQ job, not a detached promise.
- **Side Effects After Commit:** Emit real-time events and enqueue domain events only after the database transaction commits.
- **Time:** Store and compute timestamps in UTC. Inject a `Clock` into services that make time-based decisions (SLA, expiry, retention).
- **Logging:** Use the Fastify pino logger with `requestId`, `orgId`, and `projectId` bindings and `redact` paths for secrets. Never use `console.log` in server code.

---

### 4. Frontend & React Standards (Next.js 16 App Router)

- **Server vs. Client Components:**
  - Default to Next.js Server Components for layout, static presentation, and initial data fetching.
  - Mark components with `"use client"` only when interactivity, state, event listeners, or browser APIs (e.g., WebSockets, React Query hooks) are required.
- **Data Fetching & State:**
  - Use TanStack React Query v5 for server state, caching, mutation, and automatic invalidation.
  - Use Zustand for lightweight global client state (e.g. active modal states, notification drawer open/close).
  - Never use raw `fetch()` directly in client components. Wrap endpoints in typed React Query hooks built on the shared API client, which sends cookies (`credentials: "include"`) and parses responses with Zod.
- **Styling:**
  - Use Tailwind CSS utility classes and the design tokens from P02-S06 (Tailwind v4 `@theme`) exclusively.
  - Do not write inline CSS styles (`style={{ ... }}`) or hardcoded hex colors. The exceptions are dynamic values that cannot be expressed as classes (e.g. computed progress widths, virtualized row offsets) and chart series colors, which must read from CSS variables.
  - Reusable visual primitives (Button, Badge, Card, Dialog, Table, Skeleton, EmptyState) belong in `@testpulse/ui`.
- **Untrusted Content:** Render CI-provided text (titles, errors, stack traces) and user comments as text. `dangerouslySetInnerHTML` is forbidden for such content.

---

### 5. Cross-Platform & Windows Compatibility Standards

- **Cross-Platform NPM Scripts:**
  - Never use POSIX-only shell operators (e.g. `export NODE_ENV=production && ...` or `rm -rf dist`).
  - Use `cross-env` for environment variable injection in npm scripts: `cross-env NODE_ENV=production ...`
  - Use `rimraf` for directory cleanup: `rimraf dist` or Node scripts.
- **Path Resolution:**
  - Always use Node's `path` module (`path.join()`, `path.resolve()`) rather than concatenating strings with `/` or `\`.
- **Line Endings & Encoding:**
  - `.gitattributes` enforces `* text=auto eol=lf`, and `.editorconfig` sets `end_of_line = lf` and `charset = utf-8`. Files are saved without a BOM.
- **Path Data:**
  - File paths received from test runners are normalized to POSIX separators and made relative to the repository root before they are stored or hashed. Windows and Linux runs of the same test must produce the same fingerprint.

---

### 6. Dependency Discipline

Before adding any npm package:
1. Verify its bundle size impact, license (MIT, Apache-2.0, BSD), and active maintenance status.
2. Justify why built-in primitives or custom code are insufficient.
3. Pin package versions where appropriate to maintain deterministic builds.
