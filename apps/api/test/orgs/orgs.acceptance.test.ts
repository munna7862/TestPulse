/**
 * Acceptance S-001 AC1-AC8 (planning/slices/S-001-organizations-and-tenant-context.md):
 * org create/list/get/update/delete, member list, and ownership transfer.
 */
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { OrgService } from "../../src/modules/orgs";
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

interface OrgBody {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  role: string;
  createdAt: string;
}

async function createOrg(owner: TestUser, payload: Record<string, unknown>): Promise<OrgBody> {
  const res = await callAs(app, owner, "POST", "/api/v1/orgs", payload);
  if (res.statusCode !== 201) throw new Error(`create org failed: ${res.statusCode} ${res.body}`);
  return res.json<{ data: OrgBody }>().data;
}

async function addMember(orgId: string, user: TestUser, role: "ADMIN" | "MEMBER" | "VIEWER"): Promise<void> {
  await testDb.db.orgMember.create({ data: { orgId, userId: user.id, role } });
}

async function rolesOf(orgId: string): Promise<Record<string, string>> {
  const rows = await testDb.db.orgMember.findMany({ where: { orgId } });
  return Object.fromEntries(rows.map((row) => [row.userId, row.role]));
}

describe("Acceptance S-001 AC1: create an organization", () => {
  it("[SC-ORG-001] a verified user creates an org on FREE, gets a derived slug and is its only OWNER", async () => {
    const owner = await createUser(app, testDb.db, "ac1-owner@example.com");
    const res = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Acme QA Team" });

    expect(res.statusCode).toBe(201);
    const org = res.json<{ success: boolean; data: OrgBody }>().data;
    expect(org).toMatchObject({ name: "Acme QA Team", slug: "acme-qa-team", planTier: "FREE", role: "OWNER" });
    expect(typeof org.id).toBe("string");
    expect(new Date(org.createdAt).toISOString()).toBe(org.createdAt);
    expect(await rolesOf(org.id)).toEqual({ [owner.id]: "OWNER" });
  });

  it("[SC-ORG-001] an explicit slug is used as given", async () => {
    const owner = await createUser(app, testDb.db, "ac1-slug@example.com");
    const org = await createOrg(owner, { name: "Whatever Name", slug: "explicit-slug" });
    expect(org.slug).toBe("explicit-slug");
  });

  it("[SC-ORG-001] an unverified user gets 403 EMAIL_NOT_VERIFIED and no org is created", async () => {
    const user = await createUser(app, testDb.db, "ac1-unverified@example.com", { verified: false });
    const res = await callAs(app, user, "POST", "/api/v1/orgs", { name: "Never Created" });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ success: false, error: { code: "EMAIL_NOT_VERIFIED" } });
    expect(await testDb.db.organization.count({ where: { name: "Never Created" } })).toBe(0);
  });

  it("[SC-ORG-001] an unauthenticated request gets 401", async () => {
    const res = await callAs(app, null, "POST", "/api/v1/orgs", { name: "Anonymous" });
    expect(res.statusCode).toBe(401);
  });

  it("[SC-ORG-001] an empty name or a malformed slug is rejected with 400 VALIDATION_ERROR", async () => {
    const owner = await createUser(app, testDb.db, "ac1-invalid@example.com");
    for (const payload of [{ name: "   " }, { name: "Ok", slug: "Not A Slug!" }, { name: "Ok", slug: "-x-" }]) {
      const res = await callAs(app, owner, "POST", "/api/v1/orgs", payload);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    }
  });
});

describe("Acceptance S-001 AC2: slug collisions", () => {
  it("[SC-ORG-001] a taken explicit slug returns 409 CONFLICT and creates no org or membership", async () => {
    const first = await createUser(app, testDb.db, "ac2-first@example.com");
    const second = await createUser(app, testDb.db, "ac2-second@example.com");
    await createOrg(first, { name: "First", slug: "taken-slug" });

    const res = await callAs(app, second, "POST", "/api/v1/orgs", { name: "Second", slug: "taken-slug" });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ success: false, error: { code: "CONFLICT" } });
    expect(await testDb.db.organization.count({ where: { slug: "taken-slug" } })).toBe(1);
    expect(await testDb.db.orgMember.count({ where: { userId: second.id } })).toBe(0);
  });

  it("[SC-ORG-001] a taken derived slug returns 409 CONFLICT", async () => {
    const owner = await createUser(app, testDb.db, "ac2-derived@example.com");
    await createOrg(owner, { name: "Derived Name" });
    const res = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Derived  NAME" });
    expect(res.statusCode).toBe(409);
  });

  it("[SC-ORG-001] five concurrent creates with one slug yield exactly one org and one membership", async () => {
    const users = await Promise.all(
      [0, 1, 2, 3, 4].map((i) => createUser(app, testDb.db, `ac2-race-${i}@example.com`)),
    );
    const results = await Promise.all(
      users.map((user) => callAs(app, user, "POST", "/api/v1/orgs", { name: "Race", slug: "race-slug" })),
    );

    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409, 409, 409, 409]);
    const orgs = await testDb.db.organization.findMany({ where: { slug: "race-slug" } });
    expect(orgs).toHaveLength(1);
    expect(await testDb.db.orgMember.count({ where: { orgId: orgs[0]?.id ?? "" } })).toBe(1);
    expect(await testDb.db.orgMember.count({ where: { userId: { in: users.map((u) => u.id) } } })).toBe(1);
  });
});

describe("Acceptance S-001 AC3: list my organizations", () => {
  it("[SC-ORG-002] returns only the caller's live memberships, each with the caller's role", async () => {
    const alice = await createUser(app, testDb.db, "ac3-alice@example.com");
    const bob = await createUser(app, testDb.db, "ac3-bob@example.com");
    const own = await createOrg(alice, { name: "Alice Org", slug: "ac3-alice-org" });
    const shared = await createOrg(bob, { name: "Bob Shared", slug: "ac3-bob-shared" });
    await createOrg(bob, { name: "Bob Private", slug: "ac3-bob-private" });
    const gone = await createOrg(alice, { name: "Alice Gone", slug: "ac3-alice-gone" });
    await addMember(shared.id, alice, "VIEWER");
    await testDb.db.organization.update({ where: { id: gone.id }, data: { deletedAt: new Date() } });

    const res = await callAs(app, alice, "GET", "/api/v1/orgs");
    expect(res.statusCode).toBe(200);
    const list = res.json<{ data: OrgBody[] }>().data;
    expect(list.map((o) => [o.slug, o.role]).sort()).toEqual([
      ["ac3-alice-org", "OWNER"],
      ["ac3-bob-shared", "VIEWER"],
    ]);
    expect(list.find((o) => o.id === own.id)?.planTier).toBe("FREE");
  });

  it("[SC-ORG-002] ?slug= resolves one of my orgs and never another user's org", async () => {
    const carol = await createUser(app, testDb.db, "ac3-carol@example.com");
    const dave = await createUser(app, testDb.db, "ac3-dave@example.com");
    await createOrg(carol, { name: "Carol", slug: "ac3-carol" });
    await createOrg(dave, { name: "Dave", slug: "ac3-dave" });

    const mine = await callAs(app, carol, "GET", "/api/v1/orgs?slug=ac3-carol");
    expect(mine.json<{ data: OrgBody[] }>().data.map((o) => o.slug)).toEqual(["ac3-carol"]);

    const theirs = await callAs(app, carol, "GET", "/api/v1/orgs?slug=ac3-dave");
    expect(theirs.statusCode).toBe(200);
    expect(theirs.json<{ data: OrgBody[] }>().data).toEqual([]);
  });

  it("[SC-ORG-002] a user with no memberships gets an empty list", async () => {
    const loner = await createUser(app, testDb.db, "ac3-loner@example.com");
    const res = await callAs(app, loner, "GET", "/api/v1/orgs");
    expect(res.json()).toEqual({ success: true, data: [] });
  });
});

describe("Acceptance S-001 AC4: org details and member list", () => {
  it("[SC-ORG-002] a Viewer reads the org with their own role", async () => {
    const owner = await createUser(app, testDb.db, "ac4-owner@example.com");
    const viewer = await createUser(app, testDb.db, "ac4-viewer@example.com");
    const org = await createOrg(owner, { name: "Details Org", slug: "ac4-details" });
    await addMember(org.id, viewer, "VIEWER");

    const res = await callAs(app, viewer, "GET", `/api/v1/orgs/${org.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.json<{ data: OrgBody }>().data).toMatchObject({
      id: org.id,
      name: "Details Org",
      slug: "ac4-details",
      planTier: "FREE",
      role: "VIEWER",
    });
  });

  it("[SC-ORG-002] the member list exposes only userId, name, email, role and joinedAt", async () => {
    const owner = await createUser(app, testDb.db, "ac4-list-owner@example.com");
    const member = await createUser(app, testDb.db, "ac4-list-member@example.com");
    const org = await createOrg(owner, { name: "List Org", slug: "ac4-list" });
    await addMember(org.id, member, "MEMBER");

    const res = await callAs(app, member, "GET", `/api/v1/orgs/${org.id}/members`);
    expect(res.statusCode).toBe(200);
    const members = res.json<{ data: Record<string, unknown>[] }>().data;
    expect(members).toHaveLength(2);
    for (const row of members) {
      expect(Object.keys(row).sort()).toEqual(["email", "joinedAt", "name", "role", "userId"]);
    }
    expect(members.map((m) => [m.email, m.role]).sort()).toEqual([
      ["ac4-list-member@example.com", "MEMBER"],
      ["ac4-list-owner@example.com", "OWNER"],
    ]);
  });
});

describe("Acceptance S-001 AC5: update org settings", () => {
  it("[SC-ORG-003] the Owner and an Admin rename the org; a Member and a Viewer get 403", async () => {
    const owner = await createUser(app, testDb.db, "ac5-owner@example.com");
    const admin = await createUser(app, testDb.db, "ac5-admin@example.com");
    const member = await createUser(app, testDb.db, "ac5-member@example.com");
    const viewer = await createUser(app, testDb.db, "ac5-viewer@example.com");
    const org = await createOrg(owner, { name: "Before", slug: "ac5-org" });
    await addMember(org.id, admin, "ADMIN");
    await addMember(org.id, member, "MEMBER");
    await addMember(org.id, viewer, "VIEWER");

    const byAdmin = await callAs(app, admin, "PATCH", `/api/v1/orgs/${org.id}`, { name: "Renamed By Admin" });
    expect(byAdmin.statusCode).toBe(200);
    expect(byAdmin.json<{ data: OrgBody }>().data).toMatchObject({ name: "Renamed By Admin", role: "ADMIN" });

    const byOwner = await callAs(app, owner, "PATCH", `/api/v1/orgs/${org.id}`, { name: "Renamed By Owner" });
    expect(byOwner.statusCode).toBe(200);

    for (const low of [member, viewer]) {
      const res = await callAs(app, low, "PATCH", `/api/v1/orgs/${org.id}`, { name: "Hijacked" });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
    }
    const stored = await testDb.db.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(stored.name).toBe("Renamed By Owner");
    expect(stored.slug).toBe("ac5-org");
  });
});

describe("Acceptance S-001 AC6: delete an organization", () => {
  it("[SC-ORG-004] an Admin gets 403; the Owner soft-deletes and the org is 404 for everyone afterwards", async () => {
    const owner = await createUser(app, testDb.db, "ac6-owner@example.com");
    const admin = await createUser(app, testDb.db, "ac6-admin@example.com");
    const org = await createOrg(owner, { name: "Doomed", slug: "ac6-doomed" });
    await addMember(org.id, admin, "ADMIN");

    const byAdmin = await callAs(app, admin, "DELETE", `/api/v1/orgs/${org.id}`);
    expect(byAdmin.statusCode).toBe(403);

    const byOwner = await callAs(app, owner, "DELETE", `/api/v1/orgs/${org.id}`);
    expect(byOwner.statusCode).toBe(204);

    for (const user of [owner, admin]) {
      expect((await callAs(app, user, "GET", `/api/v1/orgs/${org.id}`)).statusCode).toBe(404);
      expect((await callAs(app, user, "GET", `/api/v1/orgs/${org.id}/members`)).statusCode).toBe(404);
      expect((await callAs(app, user, "DELETE", `/api/v1/orgs/${org.id}`)).statusCode).toBe(404);
      const list = (await callAs(app, user, "GET", "/api/v1/orgs")).json<{ data: OrgBody[] }>();
      expect(list.data.some((o) => o.id === org.id)).toBe(false);
    }
    // Soft delete: the row stays for the async purge job (S-002).
    const stored = await testDb.db.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(stored.deletedAt).not.toBeNull();
  });
});

describe("Acceptance S-001 AC7: transfer ownership", () => {
  it("[SC-ORG-005] the Owner hands ownership to an Admin and becomes an Admin; exactly one Owner remains", async () => {
    const owner = await createUser(app, testDb.db, "ac7-owner@example.com");
    const admin = await createUser(app, testDb.db, "ac7-admin@example.com");
    const org = await createOrg(owner, { name: "Handover", slug: "ac7-handover" });
    await addMember(org.id, admin, "ADMIN");

    const res = await callAs(app, owner, "POST", `/api/v1/orgs/${org.id}/transfer-ownership`, { userId: admin.id });
    expect(res.statusCode).toBe(200);
    expect(await rolesOf(org.id)).toEqual({ [owner.id]: "ADMIN", [admin.id]: "OWNER" });

    // The previous Owner lost Owner-only actions; the new Owner has them.
    expect((await callAs(app, owner, "DELETE", `/api/v1/orgs/${org.id}`)).statusCode).toBe(403);
    const back = await callAs(app, admin, "POST", `/api/v1/orgs/${org.id}/transfer-ownership`, { userId: owner.id });
    expect(back.statusCode).toBe(200);
    expect(await rolesOf(org.id)).toEqual({ [owner.id]: "OWNER", [admin.id]: "ADMIN" });
  });

  it("[SC-ORG-005] two concurrent transfers to different Admins leave exactly one Owner", async () => {
    const owner = await createUser(app, testDb.db, "ac7-race-owner@example.com");
    const adminA = await createUser(app, testDb.db, "ac7-race-a@example.com");
    const adminB = await createUser(app, testDb.db, "ac7-race-b@example.com");
    const org = await createOrg(owner, { name: "Race Handover", slug: "ac7-race" });
    await addMember(org.id, adminA, "ADMIN");
    await addMember(org.id, adminB, "ADMIN");

    // Hold both requests until each has passed the tenant-context role check as OWNER, so they truly race on
    // the stale role and only the transaction itself can keep a second Owner from appearing.
    const original = Object.getOwnPropertyDescriptor(OrgService.prototype, "transferOwnership")
      ?.value as OrgService["transferOwnership"];
    let arrived = 0;
    let release: () => void = () => undefined;
    const allArrived = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(OrgService.prototype, "transferOwnership").mockImplementation(async function (
      this: OrgService,
      ...args: Parameters<OrgService["transferOwnership"]>
    ) {
      arrived += 1;
      if (arrived >= 2) release();
      await Promise.race([allArrived, new Promise((resolve) => setTimeout(resolve, 2_000))]);
      return original.apply(this, args);
    });

    const results = await Promise.all(
      [adminA, adminB].map((target) =>
        callAs(app, owner, "POST", `/api/v1/orgs/${org.id}/transfer-ownership`, { userId: target.id }),
      ),
    );

    expect(arrived).toBe(2);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 403]);
    const roles = await rolesOf(org.id);
    expect(Object.values(roles).filter((role) => role === "OWNER")).toHaveLength(1);
    expect(roles[owner.id]).toBe("ADMIN");
  });
});

describe("Acceptance S-001 AC8: invalid ownership transfers change nothing", () => {
  it("[SC-ORG-006] non-Owners get 403, a non-member target 404, and a Member, Viewer or self target 400", async () => {
    const owner = await createUser(app, testDb.db, "ac8-owner@example.com");
    const admin = await createUser(app, testDb.db, "ac8-admin@example.com");
    const member = await createUser(app, testDb.db, "ac8-member@example.com");
    const viewer = await createUser(app, testDb.db, "ac8-viewer@example.com");
    const outsider = await createUser(app, testDb.db, "ac8-outsider@example.com");
    const org = await createOrg(owner, { name: "Guarded", slug: "ac8-guarded" });
    await createOrg(outsider, { name: "Outsider Org", slug: "ac8-outsider-org" });
    await addMember(org.id, admin, "ADMIN");
    await addMember(org.id, member, "MEMBER");
    await addMember(org.id, viewer, "VIEWER");
    const before = await rolesOf(org.id);
    const url = `/api/v1/orgs/${org.id}/transfer-ownership`;

    const byAdmin = await callAs(app, admin, "POST", url, { userId: admin.id });
    expect(byAdmin.statusCode).toBe(403);
    expect(byAdmin.json()).toMatchObject({ error: { code: "FORBIDDEN" } });

    const toOutsider = await callAs(app, owner, "POST", url, { userId: outsider.id });
    expect(toOutsider.statusCode).toBe(404);
    expect(toOutsider.json()).toMatchObject({ error: { code: "NOT_FOUND" } });

    const toUnknown = await callAs(app, owner, "POST", url, { userId: "01999999-0000-7000-8000-000000000000" });
    expect(toUnknown.statusCode).toBe(404);

    for (const target of [member, viewer, owner]) {
      const res = await callAs(app, owner, "POST", url, { userId: target.id });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    }

    expect(await rolesOf(org.id)).toEqual(before);
  });
});
