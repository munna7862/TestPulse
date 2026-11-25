import { type Org, type Project } from "@testpulse/shared";
import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";
import {
  canManageProjects,
  createWorkspaceClient,
  effectiveRetentionDays,
  formatWorkspaceError,
  getOnboardingStep,
  resolveActiveOrg,
  resolveActiveProject,
} from "./workspace";

const makeOrg = (overrides: Partial<Org> = {}): Org => ({
  id: "01950000-0000-7000-8000-000000000001",
  name: "Acme QA",
  slug: "acme-qa",
  planTier: "FREE",
  role: "OWNER",
  createdAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "01950000-0000-7000-8000-000000000101",
  orgId: "01950000-0000-7000-8000-000000000001",
  name: "Core Web",
  slug: "core-web",
  description: "End-to-end suite",
  defaultBranch: "main",
  slaDays: 14,
  retentionDays: 30,
  flakyWindow: 10,
  flakyThreshold: 3,
  trackedBranches: ["main"],
  role: "OWNER",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("[SC-ORG-002] workspace selection and fallback helpers", () => {
  it("picks the preferred org when present and falls back cleanly otherwise", () => {
    const orgA = makeOrg({ id: "01950000-0000-7000-8000-000000000001", name: "Org A" });
    const orgB = makeOrg({ id: "01950000-0000-7000-8000-000000000002", name: "Org B", planTier: "PRO" });

    expect(resolveActiveOrg([orgA, orgB], orgB.id)).toEqual(orgB);
    expect(resolveActiveOrg([orgA, orgB], "stale-org-id")).toEqual(orgA);
    expect(resolveActiveOrg([orgA, orgB], null)).toEqual(orgA);
    expect(resolveActiveOrg([], orgA.id)).toBeNull();
  });

  it("picks the preferred project when present and falls back cleanly otherwise", () => {
    const p1 = makeProject({ id: "01950000-0000-7000-8000-000000000101", name: "One" });
    const p2 = makeProject({ id: "01950000-0000-7000-8000-000000000102", name: "Two" });

    expect(resolveActiveProject([p1, p2], p2.id)).toEqual(p2);
    expect(resolveActiveProject([p1, p2], "deleted-project")).toEqual(p1);
    expect(resolveActiveProject([], p1.id)).toBeNull();
  });
});

describe("[SC-ORG-009] onboarding progression helper", () => {
  it("transitions create-org -> create-project -> ready as tenant resources exist", () => {
    const org = makeOrg();
    const project = makeProject();

    expect(getOnboardingStep([], [])).toBe("create-org");
    expect(getOnboardingStep([org], [])).toBe("create-project");
    expect(getOnboardingStep([org], [project])).toBe("ready");
  });
});

describe("[SC-ORG-007] project role & retention helpers", () => {
  it("allows project management only for Admin and Owner roles", () => {
    expect(canManageProjects("OWNER")).toBe(true);
    expect(canManageProjects("ADMIN")).toBe(true);
    expect(canManageProjects("MEMBER")).toBe(false);
    expect(canManageProjects("VIEWER")).toBe(false);
  });

  it("caps requested retention days by the organization plan maximum", () => {
    expect(effectiveRetentionDays(30, "FREE")).toBe(7);
    expect(effectiveRetentionDays(5, "FREE")).toBe(5);
    expect(effectiveRetentionDays(120, "PRO")).toBe(90);
    expect(effectiveRetentionDays(365, "ENTERPRISE")).toBe(365);
  });
});

describe("[SC-ORG-001] [SC-ORG-007] [SC-ORG-008] workspace API client & error formatting", () => {
  it("lists, creates, updates, and deletes orgs and projects with cookies and Zod validation", async () => {
    const org = makeOrg();
    const project = makeProject();
    const updatedProject = makeProject({ name: "Renamed Web", slaDays: 30, retentionDays: 14 });
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";
      if (url === "/api/v1/orgs" && method === "GET") return jsonResponse(200, { success: true, data: [org] });
      if (url === "/api/v1/orgs" && method === "POST") return jsonResponse(201, { success: true, data: org });
      if (url === `/api/v1/orgs/${org.id}/projects` && method === "GET") {
        return jsonResponse(200, { success: true, data: [project] });
      }
      if (url === `/api/v1/orgs/${org.id}/projects` && method === "POST") {
        return jsonResponse(201, { success: true, data: project });
      }
      if (url === `/api/v1/projects/${project.id}` && method === "PATCH") {
        return jsonResponse(200, { success: true, data: updatedProject });
      }
      if (url === `/api/v1/projects/${project.id}` && method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      return jsonResponse(404, { success: false, error: { code: "NOT_FOUND", message: "Missing" } });
    });

    const client = createWorkspaceClient({ fetch: fetchMock });

    expect(await client.listOrgs()).toEqual([org]);
    expect(await client.createOrg({ name: "Acme QA" })).toEqual(org);
    expect(await client.listProjects(org.id)).toEqual([project]);
    expect(await client.createProject(org.id, { name: "Core Web" })).toEqual(project);
    expect(await client.updateProject(project.id, { name: "Renamed Web", slaDays: 30, retentionDays: 14 })).toEqual(
      updatedProject,
    );
    await expect(client.deleteProject(project.id)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("maps API error codes into friendly human messages without raw error codes", () => {
    const cases: Array<[string, string]> = [
      ["CONFLICT", "Slug taken"],
      ["PLAN_LIMIT_REACHED", "Limit hit"],
      ["FORBIDDEN", "Nope"],
      ["EMAIL_NOT_VERIFIED", "Verify first"],
      ["NOT_FOUND", "Gone"],
      ["INTERNAL", "Boom"],
    ];

    for (const [code, serverMessage] of cases) {
      const msg = formatWorkspaceError(new ApiClientError(400, { code, message: serverMessage }), "Fallback error.");
      expect(msg.length).toBeGreaterThan(10);
      expect(msg).not.toMatch(/[A-Z]+_[A-Z_]+|\b[45]\d\d\b/);
    }
    expect(formatWorkspaceError(new Error("network down"), "Could not save changes.")).toBe("Could not save changes.");
  });
});
