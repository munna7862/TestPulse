/**
 * Acceptance S-009a AC1 (planning/slices/S-009a-audit-isolation-logging.md):
 * Full-app route classification meta-test, cross-tenant 404 & RBAC 403 verification across
 * all org and project routes, static systemDb allow-list audit, and AuditEvent TenantDb runtime guards.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createTenantDb } from "@testpulse/db";
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import {
  assertAllRoutesClassified,
  NON_TENANT_ROUTES,
  ORG_ROUTE_POLICY,
  PROJECT_ROUTE_POLICY,
} from "../../src/plugins/tenant-context";
import { callAs, createUser, ORIGIN, type TestUser } from "../orgs/helpers";

const testDb = useTestDatabase();
const ROLE_ORDER = ["VIEWER", "MEMBER", "ADMIN", "OWNER"] as const;
type Role = (typeof ROLE_ORDER)[number];

let app: FastifyInstance;
const collectedRoutes: { method: string; url: string }[] = [];
const usersByRole = {} as Record<Role, TestUser>;
let outsider: TestUser;
let orgId: string;
let projectId: string;
let foreignProjectId: string;

function fillParams(template: string, id: string): string {
  return template
    .replace(":orgId", id)
    .replace(":projectId", id)
    .replace(/:[A-Za-z]+/g, () => crypto.randomUUID());
}

/** Recursively collects `.ts` files under `dir`. */
function walkTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

const SYSTEM_DB_ALLOWLIST = new Set([
  "app.ts",
  "modules/auth/auth.middleware.ts",
  "modules/auth/auth.service.ts",
  "modules/auth/oauth/oauth.service.ts",
  "modules/invitations/invitations.service.ts",
  "modules/orgs/orgs.service.ts",
  "plugins/api-key-auth.ts",
  "plugins/tenant-context.ts",
  "queues/purge.ts",
]);

beforeAll(async () => {
  app = await buildApp({
    env: loadApiEnv({
      NODE_ENV: "production",
      AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: "1000",
      AUTH_RATE_LIMIT_LOGIN_PER_EMAIL_PER_15_MIN: "1000",
      AUTH_RATE_LIMIT_RECOVERY_PER_HOUR: "1000",
      AUTH_RATE_LIMIT_RECOVERY_PER_EMAIL_PER_HOUR: "1000",
      AUTH_GENERIC_RESPONSE_MIN_MS: "0",
      JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
      APP_URL: ORIGIN,
      WEB_ORIGIN: ORIGIN,
    }),
    db: testDb.db,
    mailer: new TestMailer(),
    logger: false,
    onRoute: (route) => collectedRoutes.push(route),
  });
  await app.ready();

  for (const role of ROLE_ORDER) {
    usersByRole[role] = await createUser(app, testDb.db, `sec-${role.toLowerCase()}@example.com`);
  }
  const orgRes = await callAs(app, usersByRole.OWNER, "POST", "/api/v1/orgs", {
    name: "Sec Audit Org",
    slug: "sec-audit-org",
  });
  orgId = orgRes.json<{ data: { id: string } }>().data.id;
  for (const role of ["ADMIN", "MEMBER", "VIEWER"] as const) {
    await testDb.db.orgMember.create({ data: { orgId, userId: usersByRole[role].id, role } });
  }
  const projRes = await callAs(app, usersByRole.OWNER, "POST", `/api/v1/orgs/${orgId}/projects`, {
    name: "Sec Project",
  });
  projectId = projRes.json<{ data: { id: string } }>().data.id;

  outsider = await createUser(app, testDb.db, "sec-outsider@example.com");
  const outOrgRes = await callAs(app, outsider, "POST", "/api/v1/orgs", {
    name: "Outsider Org",
    slug: "outsider-org",
  });
  const outOrgId = outOrgRes.json<{ data: { id: string } }>().data.id;
  const outProjRes = await callAs(app, outsider, "POST", `/api/v1/orgs/${outOrgId}/projects`, {
    name: "Foreign Project",
  });
  foreignProjectId = outProjRes.json<{ data: { id: string } }>().data.id;
});

afterAll(async () => {
  if (app) await app.close();
});

describe("Acceptance S-009a AC1: full-app route classification & tenant/RBAC isolation audit", () => {
  it("[SC-SEC-003] every route registered by buildApp appears in ORG_ROUTE_POLICY, PROJECT_ROUTE_POLICY, or NON_TENANT_ROUTES", () => {
    expect(collectedRoutes.length).toBeGreaterThanOrEqual(30);
    expect(NON_TENANT_ROUTES.length).toBeGreaterThan(0);
    expect(() => assertAllRoutesClassified(collectedRoutes)).not.toThrow();
  });

  it("[SC-SEC-003] assertAllRoutesClassified rejects any unclassified registered route", () => {
    expect(() =>
      assertAllRoutesClassified([...collectedRoutes, { method: "GET", url: "/api/v1/unclassified/:id" }]),
    ).toThrow(/unclassified/i);
  });

  it("[SC-SEC-001] every route in ORG_ROUTE_POLICY and PROJECT_ROUTE_POLICY returns 404 to outsiders", async () => {
    for (const route of ORG_ROUTE_POLICY) {
      const res = await callAs(app, outsider, route.method, fillParams(route.url, orgId));
      expect(res.statusCode, `${route.method} ${route.url}`).toBe(404);
      expect(res.json()).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
    }
    for (const route of PROJECT_ROUTE_POLICY) {
      const targetA = await callAs(app, outsider, route.method, fillParams(route.url, projectId));
      expect(targetA.statusCode, `${route.method} ${route.url} outsider`).toBe(404);
      expect(targetA.json()).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });

      const targetB = await callAs(app, usersByRole.OWNER, route.method, fillParams(route.url, foreignProjectId));
      expect(targetB.statusCode, `${route.method} ${route.url} foreignProject`).toBe(404);
    }
  });

  it("[SC-SEC-002] every route in ORG_ROUTE_POLICY and PROJECT_ROUTE_POLICY returns 403 below minimum role", async () => {
    for (const route of ORG_ROUTE_POLICY) {
      const below = ROLE_ORDER.slice(0, ROLE_ORDER.indexOf(route.minRole));
      for (const role of below) {
        const res = await callAs(app, usersByRole[role], route.method, fillParams(route.url, orgId));
        expect(res.statusCode, `${route.method} ${route.url} as ${role}`).toBe(403);
        expect(res.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
      }
    }
    for (const route of PROJECT_ROUTE_POLICY) {
      const below = ROLE_ORDER.slice(0, ROLE_ORDER.indexOf(route.minRole));
      for (const role of below) {
        const res = await callAs(app, usersByRole[role], route.method, fillParams(route.url, projectId));
        expect(res.statusCode, `${route.method} ${route.url} as ${role}`).toBe(403);
        expect(res.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
      }
    }
  });

  it("[SC-SEC-004] getSystemDb and direct unscoped Prisma calls are confined to explicitly documented allow-listed modules", () => {
    const apiSrcDir = path.resolve(import.meta.dirname, "../../src");
    const files = walkTsFiles(apiSrcDir);
    const directDbPattern = /\b(?:getSystemDb\(|(?:this\.(?:deps\.)?db|db)\.(?!\$transaction\b)[a-zA-Z_]+\b)/g;

    const unauthorized: string[] = [];
    for (const file of files) {
      const rel = path.relative(apiSrcDir, file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf8");
      const matches = content.match(directDbPattern);
      if (matches && matches.length > 0 && !SYSTEM_DB_ALLOWLIST.has(rel)) {
        unauthorized.push(`${rel}: ${matches.join(", ")}`);
      }
    }
    expect(unauthorized).toEqual([]);
  });

  it("[SC-SEC-004] createTenantDb enforces orgId scoping on AuditEvent and blocks cross-tenant writes or unscoped mutations", async () => {
    const scoped = createTenantDb(testDb.db, { orgId });
    const created = await scoped.auditEvent.create({
      data: {
        orgId,
        actorUserId: usersByRole.OWNER.id,
        action: "org.deleted",
        targetType: "organization",
        targetId: orgId,
        metadata: { source: "tenant-scope-test" },
      },
    });
    expect(created.orgId).toBe(orgId);

    const rows = await scoped.auditEvent.findMany({ where: { id: created.id } });
    expect(rows).toHaveLength(1);

    await expect(
      scoped.auditEvent.create({
        data: {
          orgId: crypto.randomUUID(),
          actorUserId: usersByRole.OWNER.id,
          action: "org.deleted",
          targetType: "organization",
          targetId: orgId,
          metadata: {},
        },
      }),
    ).rejects.toThrow(/Cross-tenant write blocked/i);

    await expect(scoped.auditEvent.findUnique({ where: { id: created.id } })).rejects.toThrow(/not allowed/i);
    await expect(scoped.auditEvent.update({ where: { id: created.id }, data: { action: "tampered" } })).rejects.toThrow(
      /not allowed/i,
    );
    await expect(scoped.auditEvent.delete({ where: { id: created.id } })).rejects.toThrow(/not allowed/i);
  });
});
