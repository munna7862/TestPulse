/**
 * Acceptance S-001 AC11: plan limits are one shared source for API enforcement and UI copy (master plan §8).
 */
import { describe, expect, it } from "vitest";
import { checkLimit, PLAN_LIMITS } from "./plans";

describe("Acceptance S-001 AC11: plan limits", () => {
  it("[SC-ORG-017] PLAN_LIMITS matches the master plan §8 table, with null meaning unlimited", () => {
    expect(PLAN_LIMITS).toEqual({
      FREE: { projectsPerOrg: 2, membersPerOrg: 3, runsPerMonth: 500, retentionDays: 7 },
      PRO: { projectsPerOrg: null, membersPerOrg: 25, runsPerMonth: 10_000, retentionDays: 90 },
      ENTERPRISE: { projectsPerOrg: null, membersPerOrg: null, runsPerMonth: null, retentionDays: 365 },
    });
  });

  it("[SC-ORG-017] checkLimit allows usage below the limit and blocks it at the limit", () => {
    expect(checkLimit("FREE", "projectsPerOrg", 0)).toEqual({ allowed: true, limit: 2 });
    expect(checkLimit("FREE", "projectsPerOrg", 1)).toEqual({ allowed: true, limit: 2 });
    expect(checkLimit("FREE", "projectsPerOrg", 2)).toEqual({ allowed: false, limit: 2 });
    expect(checkLimit("FREE", "membersPerOrg", 3)).toEqual({ allowed: false, limit: 3 });
    expect(checkLimit("PRO", "membersPerOrg", 24)).toEqual({ allowed: true, limit: 25 });
    expect(checkLimit("PRO", "membersPerOrg", 25)).toEqual({ allowed: false, limit: 25 });
    expect(checkLimit("PRO", "runsPerMonth", 10_000)).toEqual({ allowed: false, limit: 10_000 });
  });

  it("[SC-ORG-017] checkLimit always allows an unlimited quota", () => {
    expect(checkLimit("PRO", "projectsPerOrg", 1_000_000)).toEqual({ allowed: true, limit: null });
    expect(checkLimit("ENTERPRISE", "membersPerOrg", 1_000_000)).toEqual({ allowed: true, limit: null });
    expect(checkLimit("ENTERPRISE", "runsPerMonth", 1_000_000)).toEqual({ allowed: true, limit: null });
  });
});
