---
name: dev-coding-standards
description: TestPulse production coding standards for TypeScript, React, Fastify, Prisma, Zod, and architecture boundaries.
---

# Universal Dev Coding Standards for TestPulse

When writing production code for **TestPulse**, the following standards must be applied to guarantee application performance, strict type safety, clean architecture, and maintainability across **TypeScript (Next.js 15 / Fastify)**.

---

### 1. Strict Typing & Boundary Schema Validation

- **Zero Untyped Data (`any` strictly prohibited):**
  - Run in `strict: true` mode. The `any` type is strictly forbidden; use `unknown` with explicit type narrowing guards or Zod validation.
  - Never use `as unknown as Type` type assertions to bypass type checking.
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
  All API responses must follow a consistent envelope:

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
- **Database Access:**
  - The frontend (`apps/web`) must NEVER import `@testpulse/db` or access the database directly. All database access must be routed through Fastify API (`apps/api`).
- **Internal Package Namespace:**
  - Always use workspace package names: `@testpulse/shared`, `@testpulse/db`, `@testpulse/ui`, `@testpulse/reporter`.

---

### 3. API & Backend Standards (Fastify + Prisma)

- **Tenant Scoping:** Every query accessing tenant data must explicitly include `orgId` and/or `projectId`.
- **Stateless Services:** The Fastify server must remain stateless to support horizontal scaling behind a load balancer. Session state belongs in Redis or PostgreSQL.
- **Error Handling:** Never expose raw database errors or stack traces to clients. Map Prisma or internal errors to standardized HTTP status codes and messages.
- **Async Safety:** Always await promises or handle rejections. Floating promises (`void asyncFn()`) are strictly forbidden unless explicitly detached with caught errors.
- **Prisma Tenant Extension:** Where possible, utilize Prisma Client extensions (`prisma.$extends`) to automatically enforce tenant scoping on read/write queries.

---

### 4. Frontend & React Standards (Next.js 15 App Router)

- **Server vs. Client Components:**
  - Default to Next.js Server Components for layout, static presentation, and initial data fetching.
  - Mark components with `"use client"` only when interactivity, state, event listeners, or browser APIs (e.g., WebSockets, React Query hooks) are required.
- **Data Fetching & State:**
  - Use TanStack React Query v5 for server state, caching, mutation, and automatic invalidation.
  - Use Zustand for lightweight global client state (e.g. active modal states, notification drawer open/close).
  - Never use raw `fetch()` directly in client components; wrap endpoints in typed React Query hooks.
- **Styling:**
  - Use Tailwind CSS utility classes exclusively.
  - Do not write inline CSS styles (`style={{ ... }}`) or hardcoded hex colors.
  - Reusable visual primitives (Button, Badge, Card, Modal) belong in `@testpulse/ui`.

---

### 5. Cross-Platform & Windows Compatibility Standards

- **Cross-Platform NPM Scripts:**
  - Never use POSIX-only shell operators (e.g. `export NODE_ENV=production && ...` or `rm -rf dist`).
  - Use `cross-env` for environment variable injection in npm scripts: `cross-env NODE_ENV=production ...`
  - Use `rimraf` for directory cleanup: `rimraf dist` or Node scripts.
- **Path Resolution:**
  - Always use Node's `path` module (`path.join()`, `path.resolve()`) rather than concatenating strings with `/` or `\`.
- **Line Endings:**
  - Ensure all files are saved with LF or handled by Git autocrlf to prevent Windows/Linux diff churn.

---

### 6. Dependency Discipline

Before adding any npm package:
1. Verify its bundle size impact, license (MIT, Apache-2.0, BSD), and active maintenance status.
2. Justify why built-in primitives or custom code are insufficient.
3. Pin package versions where appropriate to maintain deterministic builds.
