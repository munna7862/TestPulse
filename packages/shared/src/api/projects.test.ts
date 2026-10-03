import { describe, expect, it } from "vitest";
import {
  BranchNameSchema,
  CreateProjectBodySchema,
  ProjectIdSchema,
  RetentionDaysSchema,
  SlaDaysSchema,
  UpdateProjectBodySchema,
} from "./projects";

describe("project schemas", () => {
  it("[SC-ORG-007] accepts the allowed SLAs and retention range only", () => {
    for (const days of [7, 14, 30, 60]) expect(SlaDaysSchema.safeParse(days).success).toBe(true);
    for (const days of [0, 1, 15, 61, "14"]) expect(SlaDaysSchema.safeParse(days).success).toBe(false);
    for (const days of [1, 30, 365]) expect(RetentionDaysSchema.safeParse(days).success).toBe(true);
    for (const days of [0, 366, 7.5, -1]) expect(RetentionDaysSchema.safeParse(days).success).toBe(false);
  });

  it("[SC-ORG-007] accepts ordinary branch names and rejects whitespace, control and ref-breaking characters", () => {
    for (const name of ["main", "release/1.2", "feature/JIRA-12_x", "dev.v2"]) {
      expect(BranchNameSchema.safeParse(name).success, name).toBe(true);
    }
    for (const name of [
      "",
      "has space",
      "tab\tname",
      "bell\u0007",
      "del\u007f",
      "a~b",
      "a^b",
      "a:b",
      "a?b",
      "a*b",
      "a[b",
      "a\\b",
    ]) {
      expect(BranchNameSchema.safeParse(name).success, JSON.stringify(name)).toBe(false);
    }
  });

  it("[SC-ORG-007] update requires at least one known field and rejects unknown ones", () => {
    expect(UpdateProjectBodySchema.safeParse({}).success).toBe(false);
    expect(UpdateProjectBodySchema.safeParse({ flakyWindow: 20 }).success).toBe(false);
    expect(UpdateProjectBodySchema.safeParse({ slug: "x" }).success).toBe(false);
    expect(UpdateProjectBodySchema.safeParse({ description: null }).data).toEqual({ description: null });
    expect(UpdateProjectBodySchema.safeParse({ name: "  Trimmed " }).data).toEqual({ name: "Trimmed" });
  });

  it("[SC-ORG-007] create trims the name and caps the description", () => {
    expect(CreateProjectBodySchema.safeParse({ name: "  App " }).data).toEqual({ name: "App" });
    expect(CreateProjectBodySchema.safeParse({ name: "App", description: "x".repeat(501) }).success).toBe(false);
  });

  it("[SC-SEC-001] project ids must be UUIDs", () => {
    expect(ProjectIdSchema.safeParse("01999999-0000-7000-8000-000000000000").success).toBe(true);
    expect(ProjectIdSchema.safeParse("not-an-id").success).toBe(false);
  });
});
