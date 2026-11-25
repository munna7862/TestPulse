import { describe, expect, it } from "vitest";
import { formatEffectiveRetentionHint, validateUpdateProjectInput } from "./workspace";

describe("[SC-ORG-007] project settings validation and retention hints", () => {
  it("validates editable project settings against the shared strict schema", () => {
    expect(
      validateUpdateProjectInput({
        name: " Checkout Web ",
        description: "   ",
        defaultBranch: "develop",
        slaDays: "30",
        retentionDays: "14",
      }),
    ).toEqual({
      ok: true,
      data: {
        name: "Checkout Web",
        description: null,
        defaultBranch: "develop",
        slaDays: 30,
        retentionDays: 14,
      },
    });

    expect(
      validateUpdateProjectInput({
        name: "Checkout Web",
        description: "E2E runs",
        defaultBranch: "main",
        slaDays: "7",
        retentionDays: "365",
      }),
    ).toEqual({
      ok: true,
      data: {
        name: "Checkout Web",
        description: "E2E runs",
        defaultBranch: "main",
        slaDays: 7,
        retentionDays: 365,
      },
    });

    expect(
      validateUpdateProjectInput({
        name: "   ",
        description: "",
        defaultBranch: "main",
        slaDays: "14",
        retentionDays: "30",
      }),
    ).toMatchObject({ ok: false });

    expect(
      validateUpdateProjectInput({
        name: "Web",
        description: "",
        defaultBranch: "bad branch name",
        slaDays: "14",
        retentionDays: "30",
      }),
    ).toMatchObject({ ok: false });

    expect(
      validateUpdateProjectInput({
        name: "Web",
        description: "",
        defaultBranch: "main",
        slaDays: "15",
        retentionDays: "30",
      }),
    ).toMatchObject({ ok: false });

    expect(
      validateUpdateProjectInput({
        name: "Web",
        description: "",
        defaultBranch: "main",
        slaDays: "14",
        retentionDays: "abc",
      }),
    ).toMatchObject({ ok: false });

    expect(
      validateUpdateProjectInput({
        name: "Web",
        description: `has\0nul`,
        defaultBranch: "main",
        slaDays: "14",
        retentionDays: "30",
      }),
    ).toMatchObject({ ok: false });
  });

  it("formats effective plan-capped retention copy across tiers and invalid inputs", () => {
    expect(formatEffectiveRetentionHint("30", 14, "FREE")).toBe(
      "Effective retention on Free tier: 7 days (plan max 7 days).",
    );
    expect(formatEffectiveRetentionHint("5", 14, "FREE")).toBe(
      "Effective retention on Free tier: 5 days (plan max 7 days).",
    );
    expect(formatEffectiveRetentionHint("180", 30, "PRO")).toBe(
      "Effective retention on Pro tier: 90 days (plan max 90 days).",
    );
    expect(formatEffectiveRetentionHint("not-a-number", 5, "FREE")).toBe(
      "Effective retention on Free tier: 5 days (plan max 7 days).",
    );
    expect(formatEffectiveRetentionHint("0", 365, "ENTERPRISE")).toBe(
      "Effective retention on Enterprise tier: 1 days (plan max 365 days).",
    );
  });
});
