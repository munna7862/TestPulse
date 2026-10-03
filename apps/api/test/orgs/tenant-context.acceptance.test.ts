/**
 * Acceptance S-001 AC9-AC10: one tenant-context preHandler guards every route under /api/v1/orgs/:orgId.
 * The table-driven tests iterate ORG_ROUTE_POLICY, so every route added later is covered automatically.
 */
import crypto from "node:crypto";
import { useTestDatabase } from "@testpulse/db/testing";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ORG_ROUTE_POLICY, registerTenantRouteGuard } from "../../src/plugins/tenant-context";
import { callAs, createOrgTestApp, createUser, type TestUser } from "./helpers";

const testDb = useTestDatabase();
const ROLE_ORDER = ["VIEWER", "MEMBER", "ADMIN", "OWNER"] as const;
type Role = (typeof ROLE_ORDER)[number];

let app: FastifyInstance;
let orgId: string;
let deletedOrgId: string;
let deletedOrgOwner: TestUser;
let outsider: TestUser;
const usersByRole = {} as Record<Role, TestUser>;

/** Fills :orgId and gives any other path parameter an id that matches nothing. */
function urlFor(template: string, id: string): string {
  return template.replace(":orgId", id).replace(/:[A-Za-z]+/g, () => crypto.randomUUID());
}

beforeAll(async () => {
  app = await createOrgTestApp(testDb.db);
  for (const role of ROLE_ORDER) {
    usersByRole[role] = await createUser(app, testDb.db, `tc-${role.toLowerCase()}@example.com`);
  }
  const created = await callAs(app, usersByRole.OWNER, "POST", "/api/v1/orgs", { name: "Tenant", slug: "tc-tenant" });
  orgId = created.json<{ data: { id: string } }>().data.id;
  for (const role of ["ADMIN", "MEMBER", "VIEWER"] as const) {
    await testDb.db.orgMember.create({ data: { orgId, userId: usersByRole[role].id, role } });
  }

  outsider = await createUser(app, testDb.db, "tc-outsider@example.com");
  await callAs(app, outsider, "POST", "/api/v1/orgs", { name: "Elsewhere", slug: "tc-elsewhere" });

  deletedOrgOwner = await createUser(app, testDb.db, "tc-deleted-owner@example.com");
  const doomed = await callAs(app, deletedOrgOwner, "POST", "/api/v1/orgs", { name: "Gone", slug: "tc-gone" });
  deletedOrgId = doomed.json<{ data: { id: string } }>().data.id;
  await testDb.db.organization.update({ where: { id: deletedOrgId }, data: { deletedAt: new Date() } });
});
afterAll(async () => {
  await app.close();
});

describe("Acceptance S-001 AC9: non-members get an indistinguishable 404 on every org route", () => {
  it("[SC-SEC-001] the isolation table lists the S-001 routes", () => {
    const keys = ORG_ROUTE_POLICY.map((r) => `${r.method} ${r.url}`);
    expect(keys).toEqual(
      expect.arrayContaining([
        "GET /api/v1/orgs/:orgId",
        "PATCH /api/v1/orgs/:orgId",
        "DELETE /api/v1/orgs/:orgId",
        "GET /api/v1/orgs/:orgId/members",
        "POST /api/v1/orgs/:orgId/transfer-ownership",
      ]),
    );
  });

  for (const route of ORG_ROUTE_POLICY) {
    it(`[SC-SEC-001] ${route.method} ${route.url}: outsider, missing org and deleted org all get the same 404`, async () => {
      const cases = [
        await callAs(app, outsider, route.method, urlFor(route.url, orgId)),
        await callAs(app, outsider, route.method, urlFor(route.url, crypto.randomUUID())),
        await callAs(app, outsider, route.method, urlFor(route.url, "not-an-id")),
        await callAs(app, deletedOrgOwner, route.method, urlFor(route.url, deletedOrgId)),
      ];
      const bodies = cases.map((res) => {
        expect(res.statusCode).toBe(404);
        const { error } = res.json<{ success: boolean; error: { code: string; message: string } }>();
        return { code: error.code, message: error.message };
      });
      expect(bodies[0]?.code).toBe("NOT_FOUND");
      expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
    });

    it(`[SC-SEC-001] ${route.method} ${route.url}: an unauthenticated caller gets 401`, async () => {
      const res = await callAs(app, null, route.method, urlFor(route.url, orgId));
      expect(res.statusCode).toBe(401);
    });
  }
});

describe("Acceptance S-001 AC10: every org route names its minimum role", () => {
  for (const route of ORG_ROUTE_POLICY) {
    const below = ROLE_ORDER.slice(0, ROLE_ORDER.indexOf(route.minRole));
    for (const role of below) {
      it(`[SC-SEC-002] ${route.method} ${route.url}: ${role} (below ${route.minRole}) gets 403`, async () => {
        const res = await callAs(app, usersByRole[role], route.method, urlFor(route.url, orgId));
        expect(res.statusCode).toBe(403);
        expect(res.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
      });
    }
  }

  it("[SC-SEC-002] minimum roles follow the RBAC matrix", () => {
    const policy = Object.fromEntries(ORG_ROUTE_POLICY.map((r) => [`${r.method} ${r.url}`, r.minRole]));
    expect(policy).toMatchObject({
      "GET /api/v1/orgs/:orgId": "VIEWER",
      "PATCH /api/v1/orgs/:orgId": "ADMIN",
      "DELETE /api/v1/orgs/:orgId": "OWNER",
      "GET /api/v1/orgs/:orgId/members": "VIEWER",
      "POST /api/v1/orgs/:orgId/transfer-ownership": "OWNER",
    });
  });

  it("[SC-SEC-003] every table entry is a registered route", () => {
    for (const route of ORG_ROUTE_POLICY) {
      expect(app.hasRoute({ method: route.method, url: route.url }), `${route.method} ${route.url}`).toBe(true);
    }
  });

  it("[SC-SEC-003] registering an org route missing from the table fails at startup", async () => {
    const probe = Fastify({ logger: false });
    registerTenantRouteGuard(probe);
    await expect(
      probe.register(async (scope) => {
        scope.get("/api/v1/orgs/:orgId", async () => "listed");
        scope.get("/api/v1/orgs/:orgId/unlisted", async () => "unlisted");
      }),
    ).rejects.toThrow(/\/api\/v1\/orgs\/:orgId\/unlisted .*isolation table/i);
  });

  it("[SC-SEC-003] routes outside /api/v1/orgs/:orgId do not need an entry", async () => {
    const probe = Fastify({ logger: false });
    registerTenantRouteGuard(probe);
    await probe.register(async (scope) => {
      scope.get("/api/v1/orgs", async () => "collection");
      scope.get("/api/v1/auth/me", async () => "me");
    });
    await expect(probe.ready()).resolves.toBeDefined();
    await probe.close();
  });
});
