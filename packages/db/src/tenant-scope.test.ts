import { describe, expect, it } from "vitest";
import { MODEL_SCOPE, scopeFor, scopeTenantArgs, TenantScopeError } from "./tenant-scope";

const ctx = { orgId: "org_a", projectId: "prj_a" };

describe("tenant scope rules", () => {
  it("[SC-SEC-004] injects the tenant filter with AND so callers cannot widen the scope", () => {
    const scoped = scopeTenantArgs("TestRun", "findMany", { where: { projectId: "prj_b" } }, ctx);
    expect(scoped).toEqual({ where: { AND: [{ projectId: "prj_b" }, { projectId: "prj_a" }] } });
  });

  it("[SC-SEC-004] adds a filter when none is given, for reads and bulk writes", () => {
    for (const operation of ["findFirst", "findMany", "count", "aggregate", "groupBy", "updateMany", "deleteMany"]) {
      expect(scopeTenantArgs("Project", operation, {}, ctx)).toEqual({ where: { orgId: "org_a" } });
    }
  });

  it("[SC-SEC-004] forbids unique-key operations on tenant models", () => {
    for (const operation of ["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"]) {
      expect(() => scopeTenantArgs("TestCase", operation, { where: { id: "x" } }, ctx)).toThrow(TenantScopeError);
    }
  });

  it("[SC-SEC-004] stamps the tenant key on create and createMany", () => {
    expect(scopeTenantArgs("Project", "create", { data: { name: "p" } }, ctx)).toEqual({
      data: { name: "p", orgId: "org_a" },
    });
    expect(scopeTenantArgs("TestRun", "createMany", { data: [{ runNumber: 1 }, { runNumber: 2 }] }, ctx)).toEqual({
      data: [
        { runNumber: 1, projectId: "prj_a" },
        { runNumber: 2, projectId: "prj_a" },
      ],
    });
  });

  it("[SC-SEC-004] blocks cross-tenant writes", () => {
    expect(() => scopeTenantArgs("Project", "create", { data: { name: "p", orgId: "org_b" } }, ctx)).toThrow(
      /Cross-tenant write blocked/,
    );
  });

  it("rejects global models and org creation through the tenant client", () => {
    expect(() => scopeTenantArgs("User", "findMany", {}, ctx)).toThrow(/global table/);
    expect(() => scopeTenantArgs("Organization", "create", { data: { name: "x" } }, ctx)).toThrow(TenantScopeError);
  });

  it("pins Organization reads to the context org", () => {
    expect(scopeTenantArgs("Organization", "findMany", {}, ctx)).toEqual({ where: { id: "org_a" } });
  });

  it("requires projectId in the context for project-scoped models", () => {
    expect(() => scopeTenantArgs("TestResult", "findMany", {}, { orgId: "org_a" })).toThrow(/missing projectId/);
  });

  it("fails closed for unclassified models", () => {
    expect(() => scopeFor("BrandNewModel")).toThrow(/no isolation class/);
  });

  it("classifies every model of master plan §5", () => {
    // 23 entities in master plan §5 (identity 10, execution 4, triage 3, notifications/integrations/analytics 6).
    expect(Object.keys(MODEL_SCOPE)).toHaveLength(23);
  });
});
