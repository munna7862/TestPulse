---
name: dev-coding-standards
description: TestPulse production coding standards for TypeScript, React, Fastify, Prisma, Zod, and architecture boundaries.
---

# Universal Dev Coding Standards for TestPulse

When writing production code for **TestPulse**, the following standards must be applied to guarantee application performance, strict type safety, clean architecture, and maintainability across **TypeScript (Next.js/Fastify)**.

---

### 1. Strict Typing & Boundary Schema Validation

- **Zero Untyped Data (`any` strictly prohibited):**
  - Run in `strict: true` mode. The `any` type is strictly forbidden; use `unknown` with explicit type narrowing guards.
- **Runtime Schema Validation at Boundaries:**
  - Validate all data crossing boundaries (API requests, webhook payloads, configuration files) using **Zod**.
  - Keep Zod schemas in `packages/shared` so they can be used by both the frontend (form validation) and backend (request validation).

```typescript
import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
});
export type CreateProjectPayload = z.infer<typeof CreateProjectSchema>;
```

---

### 2. Monorepo Boundaries & Architecture

- **Strict Dependency Rules:**
  - `apps/web` can import from `packages/shared` and `packages/ui`.
  - `apps/api` can import from `packages/shared` and `packages/db`.
  - `packages/shared` must NOT import from `apps/*`, `packages/db`, or `packages/ui`.
  - `packages/db` must NOT import from `apps/*`.
- **Database Access:**
  - The frontend (`apps/web`) must NEVER import from `packages/db` or access the database directly. All data access must go through the API (`apps/api`).

---

### 3. API & Backend Standards

- **Tenant Scoping:** Every query accessing tenant data must explicitly filter by `orgId` and/or `projectId`.
- **Statelessness:** The API server must be stateless to support horizontal scaling. Session state belongs in Redis or the database.
- **Error Handling:** Never expose raw database errors or stack traces to the client. Map internal errors to standardized HTTP responses.
- **Async Safety:** Always await promises or handle rejections. Avoid floating promises.

---

### 4. Frontend & React Standards

- **Server vs Client Components:** Default to Next.js Server Components. Use Client Components (`"use client"`) only when interactivity (hooks, state, event listeners) is required.
- **Data Fetching:** Use React Query (TanStack Query) for client-side data fetching and caching.
- **Styling:** Use Tailwind CSS utility classes exclusively. Do not write custom CSS unless absolutely necessary (and if so, use CSS modules).
- **Component Reusability:** Build primitive components (Buttons, Inputs, Cards) in `packages/ui` and compose them in `apps/web`.

---

### 5. Dependency Discipline

Before adding any npm package:
- Verify its bundle size impact, license, and maintenance status.
- Justify why built-in primitives or custom code are insufficient.
- Prefer smaller, focused libraries over large frameworks where appropriate.
