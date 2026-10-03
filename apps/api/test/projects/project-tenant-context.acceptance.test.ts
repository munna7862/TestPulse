/**
 * Acceptance S-002 AC7-AC8: the tenant guard covers /api/v1/projects/:projectId. Table-driven over
 * PROJECT_ROUTE_POLICY, so every project route added later is covered automatically.
 */
import crypto from "node:crypto";
import { useTestDatabase } from "@testpulse/db/testing";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ORG_ROUTE_POLICY, PROJECT_ROUTE_POLICY, registerTenantRouteGuard } from "../../src/plugins/tenant-context";
import { callAs, createOrgTestApp, createUser, type TestUser } from "../orgs/helpers";

const testDb = useTestDatabase();
const ROLE_ORDER = ["VIEWER", "MEMBER", "ADMIN", "OWNER"] as const;
type Role = (typeof ROLE_ORDER)[number];

let app: FastifyInstance;
const usersByRole = {} as Record<Role, TestUser>;
let outsider: TestUser;
let projectId: string;
let outsiderProjectId: string;
let deletedProjectId: string;
let deletedOrgProjectId: string;

function urlFor(template: string, id: string): string {
  return template.replace(":projectId", id).replace(/:[A-Za-z]+/g, () => crypto.randomUUID());
}

async function newOrg(owner: TestUser, slug: string): Promise<string> {
  const res = await callAs(app, owner, "POST", "/api/v1/orgs", { name: slug, slug });
  return res.json<{ data: { id: string } }>().data.id;
}

async function newProject(owner: TestUser, orgId: string, name: string): Promise<string> {
  const res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name });
  if (res.statusCode !== 201) throw new Error(`create project failed: ${res.statusCode} ${res.body}`);
  return res.json<{ data: { id: string } }>().data.id;
}

beforeAll(async () => {
  app = await createOrgTestApp(testDb.db);
  for (const role of ROLE_ORDER) {
    usersByRole[role] = await createUser(app, testDb.db, `ptc-${role.toLowerCase()}@example.com`);
  }
  const owner = usersByRole.OWNER;
  const orgId = await newOrg(owner, "ptc-tenant");
  for (const role of ["ADMIN", "MEMBER", "VIEWER"] as const) {
    await testDb.db.orgMember.create({ data: { orgId, userId: usersByRole[role].id, role } });
  }
  projectId = await newProject(owner, orgId, "Tenant Project");
  deletedProjectId = await newProject(owner, orgId, "Deleted Project");
  await testDb.db.project.update({ where: { id: deletedProjectId }, data: { deletedAt: new Date() } });

  const doomedOrg = await newOrg(owner, "ptc-doomed");
  deletedOrgProjectId = await newProject(owner, doomedOrg, "Orphan");
  await testDb.db.organization.update({ where: { id: doomedOrg }, data: { deletedAt: new Date() } });

  outsider = await createUser(app, testDb.db, "ptc-outsider@example.com");
  outsiderProjectId = await newProject(outsider, await newOrg(outsider, "ptc-elsewhere"), "Foreign");
});
afterAll(async () => {
  await app.close();
});

describe("Acceptance S-002 AC7: project routes return one indistinguishable 404", () => {
  it("[SC-SEC-001] the isolation tables list the S-002 routes with RBAC-matrix minimum roles", () => {
    const project = Object.fromEntries(PROJECT_ROUTE_POLICY.map((r) => [`${r.method} ${r.url}`, r.minRole]));
    expect(project).toEqual({
      "GET /api/v1/projects/:projectId": "VIEWER",
      "PATCH /api/v1/projects/:projectId": "ADMIN",
      "DELETE /api/v1/projects/:projectId": "ADMIN",
    });
    const org = Object.fromEntries(ORG_ROUTE_POLICY.map((r) => [`${r.method} ${r.url}`, r.minRole]));
    expect(org).toMatchObject({
      "GET /api/v1/orgs/:orgId/projects": "VIEWER",
      "POST /api/v1/orgs/:orgId/projects": "ADMIN",
    });
  });

  for (const route of PROJECT_ROUTE_POLICY) {
    it(`[SC-SEC-001] ${route.method} ${route.url}: foreign, missing, malformed, deleted and orphaned projects get the same 404`, async () => {
      const cases = [
        await callAs(app, outsider, route.method, urlFor(route.url, projectId)),
        await callAs(app, usersByRole.OWNER, route.method, urlFor(route.url, outsiderProjectId)),
        await callAs(app, usersByRole.OWNER, route.method, urlFor(route.url, crypto.randomUUID())),
        await callAs(app, usersByRole.OWNER, route.method, urlFor(route.url, "not-an-id")),
        await callAs(app, usersByRole.OWNER, route.method, urlFor(route.url, "%00")),
        await callAs(app, usersByRole.OWNER, route.method, urlFor(route.url, deletedProjectId)),
        await callAs(app, usersByRole.OWNER, route.method, urlFor(route.url, deletedOrgProjectId)),
      ];
      const bodies = cases.map((res, i) => {
        expect(res.statusCode, `case ${i}`).toBe(404);
        const { error } = res.json<{ error: { code: string; message: string } }>();
        return JSON.stringify({ code: error.code, message: error.message });
      });
      expect(new Set(bodies).size).toBe(1);
      expect(JSON.parse(bodies[0] ?? "{}")).toEqual({ code: "NOT_FOUND", message: "Project not found." });
    });

    it(`[SC-SEC-001] ${route.method} ${route.url}: an unauthenticated caller gets 401`, async () => {
      expect((await callAs(app, null, route.method, urlFor(route.url, projectId))).statusCode).toBe(401);
    });

    it(`[SC-SEC-001] ${route.method} ${route.url}: an outsider with an invalid body still gets 404`, async () => {
      const res = await callAs(app, outsider, route.method, urlFor(route.url, projectId), { slaDays: "bad" });
      expect(res.statusCode).toBe(404);
    });
  }
});

describe("Acceptance S-002 AC8: minimum roles and fail-closed classification", () => {
  for (const route of PROJECT_ROUTE_POLICY) {
    for (const role of ROLE_ORDER.slice(0, ROLE_ORDER.indexOf(route.minRole))) {
      it(`[SC-SEC-002] ${route.method} ${route.url}: ${role} (below ${route.minRole}) gets 403, also with an invalid body`, async () => {
        for (const payload of [undefined, { slaDays: "bad" }]) {
          const res = await callAs(app, usersByRole[role], route.method, urlFor(route.url, projectId), payload);
          expect(res.statusCode).toBe(403);
          expect(res.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
        }
      });
    }
  }

  it("[SC-SEC-002] cookie-authenticated project mutations without a same-site Origin get 403", async () => {
    for (const route of PROJECT_ROUTE_POLICY.filter((r) => r.method !== "GET")) {
      for (const headers of [{}, { origin: "https://evil.example.net" }]) {
        const res = await app.inject({
          method: route.method,
          url: urlFor(route.url, projectId),
          cookies: { tp_access: usersByRole.OWNER.accessToken },
          headers,
          ...(route.method === "PATCH" ? { payload: { name: "Forged" } } : {}),
        });
        expect(res.statusCode, `${route.method} ${JSON.stringify(headers)}`).toBe(403);
      }
    }
    const row = await testDb.db.project.findUniqueOrThrow({ where: { id: projectId } });
    expect(row).toMatchObject({ name: "Tenant Project", deletedAt: null });
  });

  it("[SC-SEC-003] every project table entry is a registered route", () => {
    for (const route of PROJECT_ROUTE_POLICY) {
      expect(app.hasRoute({ method: route.method, url: route.url }), `${route.method} ${route.url}`).toBe(true);
    }
  });

  it("[SC-SEC-003] a project route missing from the table, or not spelled :projectId, fails at startup", async () => {
    for (const [url, message] of [
      ["/api/v1/projects/:projectId/unlisted", /isolation table/],
      ["/api/v1/projects/:id", /:projectId/],
      ["/api/v1/projects/:projectId(^\\d+$)/runs", /:projectId/],
    ] as const) {
      const probe = Fastify({ logger: false });
      registerTenantRouteGuard(probe);
      const boot = async (): Promise<void> => {
        await probe.register(async (scope) => {
          scope.get(url, async () => "unguarded");
        });
      };
      await expect(boot(), url).rejects.toThrow(message);
    }
  });

  it("[SC-SEC-002] a multi-method project route enforces each method's own minimum role", async () => {
    const probe = Fastify({ logger: false });
    registerTenantRouteGuard(probe, (policy) => async (_request, reply) => reply.send({ minRole: policy.minRole }));
    probe.route({ method: ["GET", "PATCH"], url: "/api/v1/projects/:projectId", handler: async () => "none" });
    await probe.ready();
    expect((await probe.inject({ method: "GET", url: "/api/v1/projects/x" })).json()).toEqual({ minRole: "VIEWER" });
    expect((await probe.inject({ method: "PATCH", url: "/api/v1/projects/x" })).json()).toEqual({ minRole: "ADMIN" });
    await probe.close();
  });
});
