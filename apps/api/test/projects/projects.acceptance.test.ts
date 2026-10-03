/**
 * Acceptance S-002 AC1-AC6, AC9 (planning/slices/S-002-projects.md): project create/list/get/update/delete,
 * the plan project limit, and role re-checks at write time.
 */
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ProjectService } from "../../src/modules/projects";
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

interface ProjectBody {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  defaultBranch: string;
  slaDays: number;
  retentionDays: number;
  flakyWindow: number;
  flakyThreshold: number;
  trackedBranches: string[];
  role: string;
  createdAt: string;
  updatedAt: string;
}

async function createOrg(owner: TestUser, slug: string): Promise<string> {
  const res = await callAs(app, owner, "POST", "/api/v1/orgs", { name: slug, slug });
  if (res.statusCode !== 201) throw new Error(`create org failed: ${res.statusCode} ${res.body}`);
  return res.json<{ data: { id: string } }>().data.id;
}

async function addMember(orgId: string, user: TestUser, role: "ADMIN" | "MEMBER" | "VIEWER"): Promise<void> {
  await testDb.db.orgMember.create({ data: { orgId, userId: user.id, role } });
}

async function createProject(user: TestUser, orgId: string, payload: Record<string, unknown>): Promise<ProjectBody> {
  const res = await callAs(app, user, "POST", `/api/v1/orgs/${orgId}/projects`, payload);
  if (res.statusCode !== 201) throw new Error(`create project failed: ${res.statusCode} ${res.body}`);
  return res.json<{ data: ProjectBody }>().data;
}

/**
 * Holds every create until `count` have passed the tenant-context role check, so the requests truly overlap on
 * the quota and slug checks (apps/api/AGENTS.md).
 */
function barrierOnCreate(count: number): { arrived: () => number } {
  const original = Object.getOwnPropertyDescriptor(ProjectService.prototype, "create")
    ?.value as ProjectService["create"];
  let arrived = 0;
  let release: () => void = () => undefined;
  const allArrived = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(ProjectService.prototype, "create").mockImplementation(async function (
    this: ProjectService,
    ...args: Parameters<ProjectService["create"]>
  ) {
    arrived += 1;
    if (arrived >= count) release();
    await Promise.race([allArrived, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    return original.apply(this, args);
  });
  return { arrived: () => arrived };
}

describe("Acceptance S-002 AC1: create a project", () => {
  it("[SC-ORG-007] an Admin creates a project with a derived slug and the default settings", async () => {
    const owner = await createUser(app, testDb.db, "p1-owner@example.com");
    const admin = await createUser(app, testDb.db, "p1-admin@example.com");
    const orgId = await createOrg(owner, "p1-org");
    await addMember(orgId, admin, "ADMIN");

    const res = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Web App E2E" });
    expect(res.statusCode).toBe(201);
    const project = res.json<{ data: ProjectBody }>().data;
    expect(project).toMatchObject({
      orgId,
      name: "Web App E2E",
      slug: "web-app-e2e",
      description: null,
      defaultBranch: "main",
      slaDays: 14,
      retentionDays: 30,
      flakyWindow: 10,
      flakyThreshold: 3,
      trackedBranches: ["main"],
      role: "ADMIN",
    });
    const row = await testDb.db.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(row.runCounter).toBe(0);
    expect(row.deletedAt).toBeNull();
  });

  it("[SC-ORG-007] an explicit slug and description are stored as given", async () => {
    const owner = await createUser(app, testDb.db, "p1-explicit@example.com");
    const orgId = await createOrg(owner, "p1-explicit");
    const project = await createProject(owner, orgId, { name: "API", slug: "api-tests", description: "Contract" });
    expect(project).toMatchObject({ slug: "api-tests", description: "Contract", role: "OWNER" });
  });

  it("[SC-ORG-007] a Member and a Viewer get 403 and nothing is created", async () => {
    const owner = await createUser(app, testDb.db, "p1-low-owner@example.com");
    const member = await createUser(app, testDb.db, "p1-low-member@example.com");
    const viewer = await createUser(app, testDb.db, "p1-low-viewer@example.com");
    const orgId = await createOrg(owner, "p1-low");
    await addMember(orgId, member, "MEMBER");
    await addMember(orgId, viewer, "VIEWER");

    for (const user of [member, viewer]) {
      const res = await callAs(app, user, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Nope" });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
    }
    expect(await testDb.db.project.count({ where: { orgId } })).toBe(0);
  });

  it("[SC-ORG-007] a blank name or malformed slug is rejected with 400 VALIDATION_ERROR", async () => {
    const owner = await createUser(app, testDb.db, "p1-invalid@example.com");
    const orgId = await createOrg(owner, "p1-invalid");
    for (const payload of [
      { name: "  " },
      { name: "Ok", slug: "Bad Slug" },
      { name: "Ok", description: "x".repeat(501) },
    ]) {
      const res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, payload);
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
      expect(res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    }
  });
});

describe("Acceptance S-002 AC2: project slugs", () => {
  it("[SC-ORG-008] a slug reused in the same org gets 409; the same slug in another org is allowed", async () => {
    const alice = await createUser(app, testDb.db, "p2-alice@example.com");
    const bob = await createUser(app, testDb.db, "p2-bob@example.com");
    const orgA = await createOrg(alice, "p2-org-a");
    const orgB = await createOrg(bob, "p2-org-b");
    await createProject(alice, orgA, { name: "Shared", slug: "shared" });

    const again = await callAs(app, alice, "POST", `/api/v1/orgs/${orgA}/projects`, { name: "Again", slug: "shared" });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ error: { code: "CONFLICT" } });

    const elsewhere = await callAs(app, bob, "POST", `/api/v1/orgs/${orgB}/projects`, { name: "B", slug: "shared" });
    expect(elsewhere.statusCode).toBe(201);
  });

  it("[SC-ORG-008] the slug of a soft-deleted project stays taken until it is purged", async () => {
    const owner = await createUser(app, testDb.db, "p2-deleted@example.com");
    const orgId = await createOrg(owner, "p2-deleted");
    const project = await createProject(owner, orgId, { name: "Gone", slug: "gone" });
    expect((await callAs(app, owner, "DELETE", `/api/v1/projects/${project.id}`)).statusCode).toBe(204);

    const res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Gone", slug: "gone" });
    expect(res.statusCode).toBe(409);
  });

  it("[SC-ORG-008] two concurrent creates with one slug yield one 201 and one 409", async () => {
    const owner = await createUser(app, testDb.db, "p2-race@example.com");
    const orgId = await createOrg(owner, "p2-race");
    await testDb.db.organization.update({ where: { id: orgId }, data: { planTier: "PRO" } });
    const barrier = barrierOnCreate(2);

    const results = await Promise.all(
      [0, 1].map(() => callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "R", slug: "race" })),
    );
    expect(barrier.arrived()).toBe(2);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(await testDb.db.project.count({ where: { orgId, slug: "race" } })).toBe(1);
  });
});

describe("Acceptance S-002 AC3: plan project limit", () => {
  it("[SC-PLAN-001] a Free org's third project gets 403 PLAN_LIMIT_REACHED with the limit and nothing is created", async () => {
    const owner = await createUser(app, testDb.db, "p3-free@example.com");
    const orgId = await createOrg(owner, "p3-free");
    await createProject(owner, orgId, { name: "One" });
    await createProject(owner, orgId, { name: "Two" });

    const res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Three" });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      success: false,
      error: { code: "PLAN_LIMIT_REACHED", details: { limit: 2 } },
    });
    expect(await testDb.db.project.count({ where: { orgId } })).toBe(2);
  });

  it("[SC-PLAN-001] deleting a project frees its slot immediately", async () => {
    const owner = await createUser(app, testDb.db, "p3-free2@example.com");
    const orgId = await createOrg(owner, "p3-free2");
    const first = await createProject(owner, orgId, { name: "One" });
    await createProject(owner, orgId, { name: "Two" });
    expect((await callAs(app, owner, "DELETE", `/api/v1/projects/${first.id}`)).statusCode).toBe(204);

    const res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Three" });
    expect(res.statusCode).toBe(201);
  });

  it("[SC-PLAN-001] a Pro org has no project limit", async () => {
    const owner = await createUser(app, testDb.db, "p3-pro@example.com");
    const orgId = await createOrg(owner, "p3-pro");
    await testDb.db.organization.update({ where: { id: orgId }, data: { planTier: "PRO" } });
    for (const name of ["One", "Two", "Three"]) await createProject(owner, orgId, { name });
    expect(await testDb.db.project.count({ where: { orgId } })).toBe(3);
  });

  it("[SC-PLAN-001] three concurrent creates on a Free org with one project create exactly one more", async () => {
    const owner = await createUser(app, testDb.db, "p3-race@example.com");
    const orgId = await createOrg(owner, "p3-race");
    await createProject(owner, orgId, { name: "Existing" });
    const barrier = barrierOnCreate(3);

    const results = await Promise.all(
      ["A", "B", "C"].map((name) => callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name })),
    );
    expect(barrier.arrived()).toBe(3);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 403, 403]);
    expect(await testDb.db.project.count({ where: { orgId, deletedAt: null } })).toBe(2);
  });
});

describe("Acceptance S-002 AC4: list and read projects", () => {
  it("[SC-ORG-007] a Viewer lists the org's live projects with settings, and ?slug= narrows to one", async () => {
    const owner = await createUser(app, testDb.db, "p4-owner@example.com");
    const viewer = await createUser(app, testDb.db, "p4-viewer@example.com");
    const other = await createUser(app, testDb.db, "p4-other@example.com");
    const orgId = await createOrg(owner, "p4-org");
    const otherOrg = await createOrg(other, "p4-other-org");
    await testDb.db.organization.update({ where: { id: orgId }, data: { planTier: "PRO" } });
    await addMember(orgId, viewer, "VIEWER");
    await createProject(owner, orgId, { name: "Alpha", slug: "alpha" });
    await createProject(owner, orgId, { name: "Beta", slug: "beta" });
    const gone = await createProject(owner, orgId, { name: "Gone", slug: "gone" });
    await createProject(other, otherOrg, { name: "Foreign", slug: "foreign" });
    await callAs(app, owner, "DELETE", `/api/v1/projects/${gone.id}`);

    const list = await callAs(app, viewer, "GET", `/api/v1/orgs/${orgId}/projects`);
    expect(list.statusCode).toBe(200);
    const projects = list.json<{ data: ProjectBody[] }>().data;
    expect(projects.map((p) => p.slug).sort()).toEqual(["alpha", "beta"]);
    expect(projects.every((p) => p.role === "VIEWER" && p.slaDays === 14)).toBe(true);

    const one = await callAs(app, viewer, "GET", `/api/v1/orgs/${orgId}/projects?slug=beta`);
    expect(one.json<{ data: ProjectBody[] }>().data.map((p) => p.slug)).toEqual(["beta"]);
    const foreign = await callAs(app, viewer, "GET", `/api/v1/orgs/${orgId}/projects?slug=foreign`);
    expect(foreign.json<{ data: ProjectBody[] }>().data).toEqual([]);
  });

  it("[SC-ORG-007] GET /projects/:projectId returns the project with settings and the caller's role", async () => {
    const owner = await createUser(app, testDb.db, "p4-get-owner@example.com");
    const member = await createUser(app, testDb.db, "p4-get-member@example.com");
    const orgId = await createOrg(owner, "p4-get");
    await addMember(orgId, member, "MEMBER");
    const project = await createProject(owner, orgId, { name: "Read Me" });

    const res = await callAs(app, member, "GET", `/api/v1/projects/${project.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.json<{ data: ProjectBody }>().data).toMatchObject({
      id: project.id,
      orgId,
      name: "Read Me",
      retentionDays: 30,
      trackedBranches: ["main"],
      role: "MEMBER",
    });
  });
});

describe("Acceptance S-002 AC5: update project settings", () => {
  it("[SC-ORG-007] an Admin updates name, description, default branch, SLA and retention; nothing else changes", async () => {
    const owner = await createUser(app, testDb.db, "p5-owner@example.com");
    const admin = await createUser(app, testDb.db, "p5-admin@example.com");
    const orgId = await createOrg(owner, "p5-org");
    await addMember(orgId, admin, "ADMIN");
    const project = await createProject(owner, orgId, { name: "Before", slug: "before" });

    const res = await callAs(app, admin, "PATCH", `/api/v1/projects/${project.id}`, {
      name: "After",
      description: "Nightly suite",
      defaultBranch: "develop",
      slaDays: 30,
      retentionDays: 90,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ data: ProjectBody }>().data).toMatchObject({
      name: "After",
      slug: "before",
      description: "Nightly suite",
      defaultBranch: "develop",
      slaDays: 30,
      retentionDays: 90,
      flakyWindow: 10,
      flakyThreshold: 3,
      role: "ADMIN",
    });

    const partial = await callAs(app, owner, "PATCH", `/api/v1/projects/${project.id}`, { description: null });
    expect(partial.json<{ data: ProjectBody }>().data).toMatchObject({ name: "After", description: null, slaDays: 30 });
  });

  it("[SC-ORG-007] invalid values, flaky settings and empty bodies are rejected with 400; nothing changes", async () => {
    const owner = await createUser(app, testDb.db, "p5-invalid@example.com");
    const orgId = await createOrg(owner, "p5-invalid");
    const project = await createProject(owner, orgId, { name: "Stable" });

    for (const payload of [
      {},
      { slaDays: 15 },
      { retentionDays: 0 },
      { retentionDays: 366 },
      { retentionDays: 7.5 },
      { defaultBranch: "" },
      { name: "" },
      { flakyWindow: 20 },
      { trackedBranches: ["dev"] },
      { slug: "renamed" },
    ]) {
      const res = await callAs(app, owner, "PATCH", `/api/v1/projects/${project.id}`, payload);
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
      expect(res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    }
    const row = await testDb.db.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(row).toMatchObject({ name: "Stable", slug: "stable", slaDays: 14, retentionDays: 30, flakyWindow: 10 });
  });

  it("[SC-ORG-007] a Member and a Viewer get 403 and the project is unchanged", async () => {
    const owner = await createUser(app, testDb.db, "p5-low-owner@example.com");
    const member = await createUser(app, testDb.db, "p5-low-member@example.com");
    const viewer = await createUser(app, testDb.db, "p5-low-viewer@example.com");
    const orgId = await createOrg(owner, "p5-low");
    await addMember(orgId, member, "MEMBER");
    await addMember(orgId, viewer, "VIEWER");
    const project = await createProject(owner, orgId, { name: "Locked" });

    for (const user of [member, viewer]) {
      const res = await callAs(app, user, "PATCH", `/api/v1/projects/${project.id}`, { name: "Hijacked" });
      expect(res.statusCode).toBe(403);
    }
    expect((await testDb.db.project.findUniqueOrThrow({ where: { id: project.id } })).name).toBe("Locked");
  });
});

describe("Acceptance S-002 AC6: delete a project", () => {
  it("[SC-ORG-007] a Member gets 403; an Admin soft-deletes and the project is 404 everywhere afterwards", async () => {
    const owner = await createUser(app, testDb.db, "p6-owner@example.com");
    const admin = await createUser(app, testDb.db, "p6-admin@example.com");
    const member = await createUser(app, testDb.db, "p6-member@example.com");
    const orgId = await createOrg(owner, "p6-org");
    await addMember(orgId, admin, "ADMIN");
    await addMember(orgId, member, "MEMBER");
    const project = await createProject(owner, orgId, { name: "Doomed" });

    expect((await callAs(app, member, "DELETE", `/api/v1/projects/${project.id}`)).statusCode).toBe(403);
    expect((await callAs(app, admin, "DELETE", `/api/v1/projects/${project.id}`)).statusCode).toBe(204);

    for (const user of [owner, admin, member]) {
      expect((await callAs(app, user, "GET", `/api/v1/projects/${project.id}`)).statusCode).toBe(404);
      const patch = await callAs(app, user, "PATCH", `/api/v1/projects/${project.id}`, { name: "Zombie" });
      expect(patch.statusCode).toBe(404);
      expect((await callAs(app, user, "DELETE", `/api/v1/projects/${project.id}`)).statusCode).toBe(404);
    }
    const row = await testDb.db.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(row.deletedAt).not.toBeNull();
    expect(row.name).toBe("Doomed");
  });
});

describe("Acceptance S-002 AC9: role re-checked at write time", () => {
  it("[SC-ORG-007] an update that passed the role check as Admin is refused once that Admin was demoted", async () => {
    const owner = await createUser(app, testDb.db, "p9-owner@example.com");
    const admin = await createUser(app, testDb.db, "p9-admin@example.com");
    const orgId = await createOrg(owner, "p9-org");
    await addMember(orgId, admin, "ADMIN");
    const project = await createProject(owner, orgId, { name: "Original" });

    const original = Object.getOwnPropertyDescriptor(ProjectService.prototype, "update")
      ?.value as ProjectService["update"];
    vi.spyOn(ProjectService.prototype, "update").mockImplementation(async function (
      this: ProjectService,
      ...args: Parameters<ProjectService["update"]>
    ) {
      await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "MEMBER" } });
      return original.apply(this, args);
    });

    const res = await callAs(app, admin, "PATCH", `/api/v1/projects/${project.id}`, { name: "Late" });
    expect(res.statusCode).toBe(403);
    expect((await testDb.db.project.findUniqueOrThrow({ where: { id: project.id } })).name).toBe("Original");
  });

  it("[SC-ORG-007] a delete that passed the role check as Admin is refused once that Admin was demoted", async () => {
    const owner = await createUser(app, testDb.db, "p9-del-owner@example.com");
    const admin = await createUser(app, testDb.db, "p9-del-admin@example.com");
    const orgId = await createOrg(owner, "p9-del");
    await addMember(orgId, admin, "ADMIN");
    const project = await createProject(owner, orgId, { name: "Kept" });

    const original = Object.getOwnPropertyDescriptor(ProjectService.prototype, "softDelete")
      ?.value as ProjectService["softDelete"];
    vi.spyOn(ProjectService.prototype, "softDelete").mockImplementation(async function (
      this: ProjectService,
      ...args: Parameters<ProjectService["softDelete"]>
    ) {
      await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "MEMBER" } });
      return original.apply(this, args);
    });

    const res = await callAs(app, admin, "DELETE", `/api/v1/projects/${project.id}`);
    expect(res.statusCode).toBe(403);
    expect((await testDb.db.project.findUniqueOrThrow({ where: { id: project.id } })).deletedAt).toBeNull();
  });

  it("[SC-ORG-007] a create that passed the role check as Admin is refused once that Admin was demoted", async () => {
    const owner = await createUser(app, testDb.db, "p9-create-owner@example.com");
    const admin = await createUser(app, testDb.db, "p9-create-admin@example.com");
    const orgId = await createOrg(owner, "p9-create");
    await addMember(orgId, admin, "ADMIN");

    const original = Object.getOwnPropertyDescriptor(ProjectService.prototype, "create")
      ?.value as ProjectService["create"];
    vi.spyOn(ProjectService.prototype, "create").mockImplementation(async function (
      this: ProjectService,
      ...args: Parameters<ProjectService["create"]>
    ) {
      await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "VIEWER" } });
      return original.apply(this, args);
    });

    const res = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Sneaky" });
    expect(res.statusCode).toBe(403);
    expect(await testDb.db.project.count({ where: { orgId } })).toBe(0);
  });
});
