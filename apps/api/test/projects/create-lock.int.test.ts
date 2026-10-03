/**
 * Isolation test for the raw org-row lock in ProjectService.create (ADR-006 "Raw SQL" rule and amendment 1):
 * the plan tier and the lock come from the caller's own org, never another one.
 */
import { useTestDatabase } from "@testpulse/db/testing";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callAs, createOrgTestApp, createUser } from "../orgs/helpers";

const testDb = useTestDatabase();
let app: FastifyInstance;

beforeAll(async () => {
  app = await createOrgTestApp(testDb.db);
});
afterAll(async () => {
  await app.close();
});

describe("Project create: raw org-row lock isolation", () => {
  it("[SC-PLAN-001] a Free org at its limit stays limited while the caller also owns a Pro org", async () => {
    const owner = await createUser(app, testDb.db, "lock-owner@example.com");
    const free = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Free", slug: "lock-free" });
    const pro = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Pro", slug: "lock-pro" });
    const freeId = free.json<{ data: { id: string } }>().data.id;
    const proId = pro.json<{ data: { id: string } }>().data.id;
    await testDb.db.organization.update({ where: { id: proId }, data: { planTier: "PRO" } });

    for (const name of ["One", "Two"]) {
      expect((await callAs(app, owner, "POST", `/api/v1/orgs/${freeId}/projects`, { name })).statusCode).toBe(201);
    }
    const blocked = await callAs(app, owner, "POST", `/api/v1/orgs/${freeId}/projects`, { name: "Three" });
    expect(blocked.json()).toMatchObject({ error: { code: "PLAN_LIMIT_REACHED", details: { limit: 2, current: 2 } } });

    for (const name of ["One", "Two", "Three"]) {
      expect((await callAs(app, owner, "POST", `/api/v1/orgs/${proId}/projects`, { name })).statusCode).toBe(201);
    }
    expect(await testDb.db.project.count({ where: { orgId: freeId } })).toBe(2);
    expect(await testDb.db.project.count({ where: { orgId: proId } })).toBe(3);
  });

  it("[SC-PLAN-001] creating in a soft-deleted org gets 404 and creates nothing", async () => {
    const owner = await createUser(app, testDb.db, "lock-deleted@example.com");
    const res = await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Gone", slug: "lock-gone" });
    const orgId = res.json<{ data: { id: string } }>().data.id;
    await testDb.db.organization.update({ where: { id: orgId }, data: { deletedAt: new Date() } });

    const create = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Orphan" });
    expect(create.statusCode).toBe(404);
    expect(await testDb.db.project.count({ where: { orgId } })).toBe(0);
  });
});
