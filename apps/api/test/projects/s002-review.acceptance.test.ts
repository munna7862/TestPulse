/**
 * Acceptance S-002-review: closes what the independent review of the S-002 branch proved.
 * - security-reviewer F1: NUL bytes in names, descriptions and ?slug= returned 500 (S-001 org name too).
 * - security-reviewer note: an org-scope route carrying :projectId would never check the project belongs to the org.
 * - security-reviewer note: a project with no usable slug characters got the slug "org".
 * - test-auditor: deleted-between-check-and-write, mixed PATCH bodies, list role and order, and `details.current`
 *   survived mutation.
 */
import { useTestDatabase } from "@testpulse/db/testing";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ProjectService } from "../../src/modules/projects";
import { registerTenantRouteGuard } from "../../src/plugins/tenant-context";
import { callAs, createOrgTestApp, createUser, type TestUser } from "../orgs/helpers";

const testDb = useTestDatabase();
let app: FastifyInstance;

beforeAll(async () => {
  app = await createOrgTestApp(testDb.db);
});
afterAll(async () => {
  await app.close();
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function createOrg(owner: TestUser, slug: string): Promise<string> {
  const res = await callAs(app, owner, "POST", "/api/v1/orgs", { name: slug, slug });
  if (res.statusCode !== 201) throw new Error(`create org failed: ${res.statusCode} ${res.body}`);
  return res.json<{ data: { id: string } }>().data.id;
}

async function createProject(user: TestUser, orgId: string, payload: Record<string, unknown>) {
  const res = await callAs(app, user, "POST", `/api/v1/orgs/${orgId}/projects`, payload);
  if (res.statusCode !== 201) throw new Error(`create project failed: ${res.statusCode} ${res.body}`);
  return res.json<{ data: { id: string; slug: string; role: string } }>().data;
}

describe("Acceptance S-002-review: control characters are rejected with 400, never 500 (F1)", () => {
  it("[SC-ORG-007] NUL in a project name, description or ?slug= gets 400 VALIDATION_ERROR", async () => {
    const owner = await createUser(app, testDb.db, "rv2-nul@example.com");
    const orgId = await createOrg(owner, "rv2-nul");
    const project = await createProject(owner, orgId, { name: "Clean" });

    const attempts = [
      await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "n\u0000" }),
      await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Ok", description: "d\u0000" }),
      await callAs(app, owner, "PATCH", `/api/v1/projects/${project.id}`, { description: "d\u0000" }),
      await callAs(app, owner, "PATCH", `/api/v1/projects/${project.id}`, { name: "tab\tname" }),
      await callAs(app, owner, "GET", `/api/v1/orgs/${orgId}/projects?slug=%00`),
    ];
    for (const res of attempts) {
      expect(res.statusCode, res.body).toBe(400);
      expect(res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    }
    expect(await testDb.db.project.count({ where: { orgId } })).toBe(1);
  });

  it("[SC-ORG-001] NUL in an org name or ?slug= gets 400 VALIDATION_ERROR", async () => {
    const owner = await createUser(app, testDb.db, "rv2-org-nul@example.com");
    const orgId = await createOrg(owner, "rv2-org-nul");
    const attempts = [
      await callAs(app, owner, "POST", "/api/v1/orgs", { name: "n\u0000" }),
      await callAs(app, owner, "PATCH", `/api/v1/orgs/${orgId}`, { name: "n\u0000" }),
      await callAs(app, owner, "GET", "/api/v1/orgs?slug=%00"),
    ];
    for (const res of attempts) {
      expect(res.statusCode, res.body).toBe(400);
      expect(res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    }
  });

  it("[SC-ORG-007] a description keeps ordinary line breaks", async () => {
    const owner = await createUser(app, testDb.db, "rv2-newline@example.com");
    const orgId = await createOrg(owner, "rv2-newline");
    const project = await createProject(owner, orgId, { name: "Notes", description: "line one\nline two" });
    const res = await callAs(app, owner, "GET", `/api/v1/projects/${project.id}`);
    expect(res.json()).toMatchObject({ data: { description: "line one\nline two" } });
  });
});

describe("Acceptance S-002-review: org-scope routes cannot carry a project id", () => {
  it("[SC-SEC-003] a route under /api/v1/orgs/:orgId with :projectId fails at startup", async () => {
    const probe = Fastify({ logger: false });
    registerTenantRouteGuard(probe);
    const boot = async (): Promise<void> => {
      await probe.register(async (scope) => {
        scope.get("/api/v1/orgs/:orgId/projects/:projectId/runs", async () => "unchecked project");
      });
    };
    await expect(boot()).rejects.toThrow(/must not carry :projectId/);
  });
});

describe("Acceptance S-002-review: derived project slugs", () => {
  it("[SC-ORG-008] a project name with no usable characters gets the slug 'project'", async () => {
    const owner = await createUser(app, testDb.db, "rv2-slug@example.com");
    const orgId = await createOrg(owner, "rv2-slug");
    expect((await createProject(owner, orgId, { name: "!!!" })).slug).toBe("project");
  });
});

describe("Acceptance S-002-review: a project deleted between the check and the write", () => {
  for (const [label, method, payload, serviceMethod] of [
    ["update", "PATCH", { name: "Late" }, "update"],
    ["delete", "DELETE", undefined, "softDelete"],
  ] as const) {
    it(`[SC-ORG-018] an ${label} that passed the tenant check gets 404 once the project was deleted, and changes nothing`, async () => {
      const owner = await createUser(app, testDb.db, `rv2-race-${label}@example.com`);
      const orgId = await createOrg(owner, `rv2-race-${label}`);
      const project = await createProject(owner, orgId, { name: "Original" });
      const deletedAt = new Date("2026-01-01T00:00:00.000Z");

      const deleteFirst = () => testDb.db.project.update({ where: { id: project.id }, data: { deletedAt } });
      if (serviceMethod === "update") {
        const original = Object.getOwnPropertyDescriptor(ProjectService.prototype, "update")
          ?.value as ProjectService["update"];
        vi.spyOn(ProjectService.prototype, "update").mockImplementation(async function (
          this: ProjectService,
          ...args: Parameters<ProjectService["update"]>
        ) {
          await deleteFirst();
          return original.apply(this, args);
        });
      } else {
        const original = Object.getOwnPropertyDescriptor(ProjectService.prototype, "softDelete")
          ?.value as ProjectService["softDelete"];
        vi.spyOn(ProjectService.prototype, "softDelete").mockImplementation(async function (
          this: ProjectService,
          ...args: Parameters<ProjectService["softDelete"]>
        ) {
          await deleteFirst();
          return original.apply(this, args);
        });
      }

      const res = await callAs(app, owner, method, `/api/v1/projects/${project.id}`, payload);
      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: { code: "NOT_FOUND", message: "Project not found." } });
      const row = await testDb.db.project.findUniqueOrThrow({ where: { id: project.id } });
      expect(row).toMatchObject({ name: "Original", deletedAt });
    });
  }

  it("[SC-ORG-018] an update that passed the tenant check gets 404 once the org was deleted", async () => {
    const owner = await createUser(app, testDb.db, "rv2-race-org@example.com");
    const orgId = await createOrg(owner, "rv2-race-org");
    const project = await createProject(owner, orgId, { name: "Original" });

    const original = Object.getOwnPropertyDescriptor(ProjectService.prototype, "update")
      ?.value as ProjectService["update"];
    vi.spyOn(ProjectService.prototype, "update").mockImplementation(async function (
      this: ProjectService,
      ...args: Parameters<ProjectService["update"]>
    ) {
      await testDb.db.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });
      return original.apply(this, args);
    });

    const res = await callAs(app, owner, "PATCH", `/api/v1/projects/${project.id}`, { name: "Late" });
    expect(res.statusCode).toBe(404);
    expect((await testDb.db.project.findUniqueOrThrow({ where: { id: project.id } })).name).toBe("Original");
  });
});

describe("Acceptance S-002-review: contract details", () => {
  it("[SC-ORG-007] PATCH rejects an unknown key even next to a valid one", async () => {
    const owner = await createUser(app, testDb.db, "rv2-mixed@example.com");
    const orgId = await createOrg(owner, "rv2-mixed");
    const project = await createProject(owner, orgId, { name: "Stable" });
    for (const payload of [
      { name: "x", flakyWindow: 20 },
      { name: "x", slug: "y" },
      { name: "x", orgId },
    ]) {
      const res = await callAs(app, owner, "PATCH", `/api/v1/projects/${project.id}`, payload);
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
    }
    expect((await testDb.db.project.findUniqueOrThrow({ where: { id: project.id } })).name).toBe("Stable");
  });

  it("[SC-ORG-007] the list carries the caller's own role and is ordered oldest first", async () => {
    const owner = await createUser(app, testDb.db, "rv2-list-owner@example.com");
    const admin = await createUser(app, testDb.db, "rv2-list-admin@example.com");
    const orgId = await createOrg(owner, "rv2-list");
    await testDb.db.orgMember.create({ data: { orgId, userId: admin.id, role: "ADMIN" } });
    await createProject(owner, orgId, { name: "Zeta", slug: "zeta" });
    await createProject(owner, orgId, { name: "Alpha", slug: "alpha" });

    const res = await callAs(app, admin, "GET", `/api/v1/orgs/${orgId}/projects`);
    const projects = res.json<{ data: { slug: string; role: string }[] }>().data;
    expect(projects.map((p) => p.slug)).toEqual(["zeta", "alpha"]);
    expect(projects.map((p) => p.role)).toEqual(["ADMIN", "ADMIN"]);
  });

  it("[SC-PLAN-001] PLAN_LIMIT_REACHED reports the current count with the limit", async () => {
    const owner = await createUser(app, testDb.db, "rv2-current@example.com");
    const orgId = await createOrg(owner, "rv2-current");
    await createProject(owner, orgId, { name: "One" });
    await createProject(owner, orgId, { name: "Two" });
    const res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Three" });
    expect(res.json()).toMatchObject({ error: { code: "PLAN_LIMIT_REACHED", details: { limit: 2, current: 2 } } });
  });
});
