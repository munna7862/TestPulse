import { z } from "zod";

/** Plan tiers (master plan §8). v1 has no payment flow; an operator script changes `Organization.planTier`. */
export const PlanTierSchema = z.enum(["FREE", "PRO", "ENTERPRISE"]);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export interface PlanLimits {
  /** `null` means unlimited. */
  projectsPerOrg: number | null;
  /** Members including pending invitations. `null` means unlimited. */
  membersPerOrg: number | null;
  /** Test runs per org per calendar month (UTC). `null` means unlimited (fair use). */
  runsPerMonth: number | null;
  /** Maximum history retention; effective retention is `min(project.retentionDays, retentionDays)`. */
  retentionDays: number;
}

/** Single source for API enforcement and UI copy (master plan §8). */
export const PLAN_LIMITS: Readonly<Record<PlanTier, Readonly<PlanLimits>>> = {
  FREE: { projectsPerOrg: 2, membersPerOrg: 3, runsPerMonth: 500, retentionDays: 7 },
  PRO: { projectsPerOrg: null, membersPerOrg: 25, runsPerMonth: 10_000, retentionDays: 90 },
  ENTERPRISE: { projectsPerOrg: null, membersPerOrg: null, runsPerMonth: null, retentionDays: 365 },
};

export type CountedLimit = "projectsPerOrg" | "membersPerOrg" | "runsPerMonth";

export interface LimitCheck {
  allowed: boolean;
  limit: number | null;
}

/** Whether one more item fits when `current` items already count against `limit` on `tier`. */
export function checkLimit(tier: PlanTier, limit: CountedLimit, current: number): LimitCheck {
  const max = PLAN_LIMITS[tier][limit];
  return { allowed: max === null || current < max, limit: max };
}
