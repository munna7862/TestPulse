/**
 * Acceptance S-001-review: closes what the independent review of the S-001 branch proved.
 * - test-auditor: CSRF on org mutations and "tenant check before body validation" had no test.
 * - security-reviewer F1: a multi-method route enforced only its first method's minimum role.
 * - security-reviewer F2: org routes spelled other than `/api/v1/orgs/:orgId` skipped the guard silently.
 * - security-reviewer F3: rename and delete ran on a role checked before the handler (stale after a transfer).
 * - security-reviewer F4: a NUL byte in :orgId returned 500 instead of 404.
 * - claims-auditor: transfer response role and the soft-deleted slug 409 were documented but untested.
 */
import { useTestDatabase } from "@testpulse/db/testing";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { OrgService } from "../../src/modules/orgs";
import { registerTenantRouteGuard } from "../../src/plugins/tenant-context";
import { callAs, createOrgTestApp, createUser, type TestUser } from "./helpers";

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

async function orgRow(orgId: string) {
  return testDb.db.organization.findUniqueOrThrow({ where: { id: orgId } });
}

describe("Acceptance S-001-review: CSRF on organization mutations", () => {
  it("[SC-AUTH-018] cookie-authenticated mutations without a same-site Origin get 403 and change nothing", async () => {
    const owner = await createUser(app, testDb.db, "rv-csrf-owner@example.com");
    const admin = await createUser(app, testDb.db, "rv-csrf-admin@example.com");
    const orgId = await createOrg(owner, "rv-csrf");
    await testDb.db.orgMember.create({ data: { orgId, userId: admin.id, role: "ADMIN" } });

    const attempts = [
      { method: "POST" as const, url: "/api/v1/orgs", payload: { name: "Forged", slug: "rv-csrf-forged" } },
      { method: "PATCH" as const, url: `/api/v1/orgs/${orgId}`, payload: { name: "Forged" } },
      { method: "POST" as const, url: `/api/v1/orgs/${orgId}/transfer-ownership`, payload: { userId: admin.id } },
      { method: "DELETE" as const, url: `/api/v1/orgs/${orgId}` },
    ];
    for (const origin of [undefined, "https://evil.example.net"]) {
      for (const attempt of attempts) {
        const res = await app.inject({
          ...attempt,
          cookies: { tp_access: owner.accessToken },
          headers: origin ? { origin } : {},
        });
        expect(res.statusCode, `${attempt.method} ${attempt.url} origin=${origin ?? "none"}`).toBe(403);
        expect(res.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
      }
    }

    const stored = await orgRow(orgId);
    expect(stored.name).toBe("rv-csrf");
    expect(stored.deletedAt).toBeNull();
    expect(await testDb.db.organization.count({ where: { slug: "rv-csrf-forged" } })).toBe(0);
    const roles = await testDb.db.orgMember.findMany({ where: { orgId } });
    expect(Object.fromEntries(roles.map((r) => [r.userId, r.role]))).toEqual({
      [owner.id]: "OWNER",
      [admin.id]: "ADMIN",
    });
  });
});

describe("Acceptance S-001-review: the tenant check runs before body validation", () => {
  it("[SC-SEC-001] an outsider sending an invalid body gets the same 404, never a 400", async () => {
    const owner = await createUser(app, testDb.db, "rv-order-owner@example.com");
    const outsider = await createUser(app, testDb.db, "rv-order-outsider@example.com");
    const orgId = await createOrg(owner, "rv-order");

    for (const [method, url, payload] of [
      ["PATCH", `/api/v1/orgs/${orgId}`, { name: "" }],
      ["PATCH", `/api/v1/orgs/${orgId}`, {}],
      ["POST", `/api/v1/orgs/${orgId}/transfer-ownership`, { userId: 42 }],
    ] as const) {
      const res = await callAs(app, outsider, method, url, payload);
      expect(res.statusCode, `${method} ${url} ${JSON.stringify(payload)}`).toBe(404);
      expect(res.json()).toMatchObject({ error: { code: "NOT_FOUND", message: "Organization not found." } });
    }
  });

  it("[SC-SEC-002] a member below the minimum role sending an invalid body gets 403, never a 400", async () => {
    const owner = await createUser(app, testDb.db, "rv-order2-owner@example.com");
    const viewer = await createUser(app, testDb.db, "rv-order2-viewer@example.com");
    const orgId = await createOrg(owner, "rv-order2");
    await testDb.db.orgMember.create({ data: { orgId, userId: viewer.id, role: "VIEWER" } });

    const patch = await callAs(app, viewer, "PATCH", `/api/v1/orgs/${orgId}`, { name: "" });
    expect(patch.statusCode).toBe(403);
    const transfer = await callAs(app, viewer, "POST", `/api/v1/orgs/${orgId}/transfer-ownership`, { userId: 42 });
    expect(transfer.statusCode).toBe(403);
  });

  it("[SC-SEC-001] HEAD on an org route inherits the GET guard", async () => {
    const owner = await createUser(app, testDb.db, "rv-head-owner@example.com");
    const outsider = await createUser(app, testDb.db, "rv-head-outsider@example.com");
    const orgId = await createOrg(owner, "rv-head");
    expect((await callAs(app, outsider, "HEAD", `/api/v1/orgs/${orgId}/members`)).statusCode).toBe(404);
    expect((await callAs(app, null, "HEAD", `/api/v1/orgs/${orgId}/members`)).statusCode).toBe(401);
    expect((await callAs(app, owner, "HEAD", `/api/v1/orgs/${orgId}/members`)).statusCode).toBe(200);
  });
});

describe("Acceptance S-001-review: route classification fails closed (F1, F2)", () => {
  it("[SC-SEC-002] a route serving several methods enforces each method's own minimum role", async () => {
    const probe = Fastify({ logger: false });
    registerTenantRouteGuard(probe, (policy) => async (_request, reply) => reply.send({ minRole: policy.minRole }));
    probe.route({ method: ["GET", "DELETE"], url: "/api/v1/orgs/:orgId", handler: async () => ({ minRole: "none" }) });
    await probe.ready();

    expect((await probe.inject({ method: "GET", url: "/api/v1/orgs/x" })).json()).toEqual({ minRole: "VIEWER" });
    expect((await probe.inject({ method: "DELETE", url: "/api/v1/orgs/x" })).json()).toEqual({ minRole: "OWNER" });
    await probe.close();
  });

  it("[SC-SEC-003] an org route whose parameter is not spelled :orgId fails at startup", async () => {
    for (const url of [
      "/api/v1/orgs/:id/projects",
      "/api/v1/orgs/:organizationId",
      "/api/v1/orgs/:orgId(^[0-9a-f-]+$)/runs",
    ]) {
      const probe = Fastify({ logger: false });
      registerTenantRouteGuard(probe);
      const boot = async (): Promise<void> => {
        await probe.register(async (scope) => {
          scope.get(url, async () => "unguarded");
        });
      };
      await expect(boot(), url).rejects.toThrow(/:orgId/);
    }
  });
});

describe("Acceptance S-001-review: role is re-checked at write time (F3)", () => {
  it("[SC-ORG-004] a delete that passed the role check as Owner is refused once ownership moved away", async () => {
    const owner = await createUser(app, testDb.db, "rv-stale-owner@example.com");
    const admin = await createUser(app, testDb.db, "rv-stale-admin@example.com");
    const orgId = await createOrg(owner, "rv-stale");
    await testDb.db.orgMember.create({ data: { orgId, userId: admin.id, role: "ADMIN" } });

    const original = Object.getOwnPropertyDescriptor(OrgService.prototype, "softDelete")
      ?.value as OrgService["softDelete"];
    let arrived: () => void = () => undefined;
    const hasArrived = new Promise<void>((resolve) => {
      arrived = resolve;
    });
    let release: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(OrgService.prototype, "softDelete").mockImplementation(async function (
      this: OrgService,
      ...args: Parameters<OrgService["softDelete"]>
    ) {
      arrived();
      await released;
      return original.apply(this, args);
    });

    const pendingDelete = callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}`);
    await hasArrived;
    const transfer = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/transfer-ownership`, {
      userId: admin.id,
    });
    expect(transfer.statusCode).toBe(200);
    release();

    expect((await pendingDelete).statusCode).toBe(403);
    expect((await orgRow(orgId)).deletedAt).toBeNull();
  });

  it("[SC-ORG-003] a rename that passed the role check as Admin is refused once that Admin was demoted", async () => {
    const owner = await createUser(app, testDb.db, "rv-stale2-owner@example.com");
    const admin = await createUser(app, testDb.db, "rv-stale2-admin@example.com");
    const orgId = await createOrg(owner, "rv-stale2");
    await testDb.db.orgMember.create({ data: { orgId, userId: admin.id, role: "ADMIN" } });

    const original = Object.getOwnPropertyDescriptor(OrgService.prototype, "rename")?.value as OrgService["rename"];
    vi.spyOn(OrgService.prototype, "rename").mockImplementation(async function (
      this: OrgService,
      ...args: Parameters<OrgService["rename"]>
    ) {
      // Demotion lands between the role check and the write (P03-S04 adds the route that does this).
      await testDb.db.orgMember.updateMany({ where: { orgId, userId: admin.id }, data: { role: "MEMBER" } });
      return original.apply(this, args);
    });

    const res = await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}`, { name: "Renamed Late" });
    expect(res.statusCode).toBe(403);
    expect((await orgRow(orgId)).name).toBe("rv-stale2");
  });
});

describe("Acceptance S-001-review: malformed org ids (F4)", () => {
  it("[SC-SEC-001] a NUL byte or other non-id in :orgId returns the standard 404, not 500", async () => {
    const user = await createUser(app, testDb.db, "rv-nul@example.com");
    for (const id of ["%00", "a%00b", "not-an-id", "x".repeat(100)]) {
      const res = await callAs(app, user, "GET", `/api/v1/orgs/${id}`);
      expect(res.statusCode, id).toBe(404);
      expect(res.json()).toMatchObject({ error: { code: "NOT_FOUND", message: "Organization not found." } });
    }
    // Over Fastify's 100-character parameter limit the router answers 414 before any tenant check, for every
    // id alike, so it discloses nothing (approved spec change, planning/approved-spec-changes.md).
    const tooLong = await callAs(app, user, "GET", `/api/v1/orgs/${"x".repeat(200)}`);
    expect(tooLong.statusCode).toBe(414);
  });
});

describe("Acceptance S-001-review: documented behavior", () => {
  it("[SC-ORG-005] the transfer response carries the caller's new role, ADMIN", async () => {
    const owner = await createUser(app, testDb.db, "rv-role-owner@example.com");
    const admin = await createUser(app, testDb.db, "rv-role-admin@example.com");
    const orgId = await createOrg(owner, "rv-role");
    await testDb.db.orgMember.create({ data: { orgId, userId: admin.id, role: "ADMIN" } });

    const res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/transfer-ownership`, { userId: admin.id });
    expect(res.json()).toMatchObject({ success: true, data: { id: orgId, role: "ADMIN" } });
  });

  it("[SC-ORG-001] the slug of a soft-deleted org stays taken (409)", async () => {
    const owner = await createUser(app, testDb.db, "rv-slug-owner@example.com");
    const orgId = await createOrg(owner, "rv-slug-kept");
    expect((await callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}`)).statusCode).toBe(204);
    const res = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Again", slug: "rv-slug-kept" });
    expect(res.statusCode).toBe(409);
  });

  it("[SC-ORG-002] GET /orgs requires authentication; PATCH validates the name", async () => {
    expect((await callAs(app, null, "GET", "/api/v1/orgs")).statusCode).toBe(401);
    const owner = await createUser(app, testDb.db, "rv-valid-owner@example.com");
    const orgId = await createOrg(owner, "rv-valid");
    const res = await callAs(app, owner, "PATCH", `/api/v1/orgs/${orgId}`, { name: "   " });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});
