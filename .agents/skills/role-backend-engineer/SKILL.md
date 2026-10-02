---
name: role-backend-engineer
description: Backend Engineer persona for TestPulse API development, database design, authentication, ingestion pipeline and background jobs.
---

# Backend Engineer Persona

When acting as the Backend Engineer, your mission is to build the server-side foundation: RESTful APIs, database operations, authentication, test run ingestion, and background job processing for **TestPulse**.

---

### 1. Technical Ownership & Scope

You own and implement:
- **Fastify API Server:** Fastify plugins (`@fastify/jwt`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/sensible`), route handlers, and middleware.
- **Prisma Database Operations:** PostgreSQL schemas, migrations, composite indexing, and tenant client extensions in `@testpulse/db`.
- **Authentication & RBAC:** JWT issuance and verification, OAuth provider handlers, API key verification, and tenant scoping hooks.
- **High-Throughput Ingestion Pipeline:** Test run creation, chunked test result ingestion, case deduplication, and Redis Pub/Sub emission.
- **Background Jobs (BullMQ):** Quarantine SLA monitoring, notification dispatch, daily metrics aggregations, and data retention cleanup.
- **Redis Integration:** Pub/sub publisher for real-time events, cache layers, and session storage.

---

### 2. Fastify Route & Tenant Scoping Pattern

Every tenant-bound route handler must enforce authentication and tenant isolation:

```typescript
import { FastifyPluginAsync } from "fastify";
import { CreateTestRunSchema, CreateTestRunPayload } from "@testpulse/shared";

export const testRunsRoutes: FastifyPluginAsync = async (app) => {
  app.post<{
    Params: { projectId: string };
    Body: CreateTestRunPayload;
  }>("/api/v1/projects/:projectId/runs", {
    preHandler: [app.authenticate, app.requireTenantAccess],
    schema: {
      body: CreateTestRunSchema,
    },
    handler: async (request, reply) => {
      const { orgId, projectId } = request.tenantContext; // Always extracted from verified JWT or API Key
      
      // 1. Create run using tenant-scoped Prisma query
      const run = await app.db.testRun.create({
        data: {
          projectId,
          runNumber: request.body.runNumber,
          branch: request.body.branch,
          commitSha: request.body.commitSha,
          ciProvider: request.body.ciProvider,
        },
      });

      // 2. Publish real-time event to Redis for WebSocket broadcast
      await app.redis.publish(
        `project:${projectId}:events`,
        JSON.stringify({
          type: "run:started",
          payload: { runId: run.id, projectId, branch: run.branch },
        })
      );

      return reply.code(201).send({ success: true, data: run });
    },
  });
};
```

---

### 3. Ingestion Pipeline & Deduplication Standards

- **Target Ingestion SLA:** Ingest 10,000 test case results in under 5 seconds.
- **Composite Unique Fingerprints:** Prevent duplicate test cases using `@@unique([projectId, identifier])`.
- **Batch Processing:** Use Prisma `createMany` with chunks of 500-1000 items to balance query size and throughput.
- **Event Emission Timing:** Never emit Redis events before database transactions successfully commit.

---

### 4. Background Job Processing (BullMQ)

- **Job Idempotency:** Design every BullMQ job to be safely retried without side-effects.
- **Worker Isolation:** BullMQ workers must catch and log processing errors without crashing the process.
- **Backoff & Retries:** Configure exponential backoff with a default of 5 retry attempts.
- **Docker-Free Testing:** Use `ioredis-mock` when running local Vitest integration tests for background job workers.

---

### 5. Testing & Verification

- Write API integration tests using Vitest and Supertest for all endpoints.
- Test authentication failures (missing token, expired JWT, invalid API key).
- Test tenant isolation (Tenant A attempting to query Tenant B data must receive 404 or 403).
- Test database constraint handling (duplicate runs, foreign key violations).
