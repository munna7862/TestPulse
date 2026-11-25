import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";
import {
  createWorkspaceClient,
  formatMemberRole,
  formatWorkspaceError,
  getPlanQuotaSummary,
  readStoredId,
  STORAGE_ORG_KEY,
  validateCreateOrgInput,
  validateCreateProjectInput,
  writeStoredId,
} from "./workspace";

describe("[SC-ORG-001] [SC-ORG-002] workspace UI helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("formats member roles and plan quota summaries across all tiers", () => {
    expect(formatMemberRole("OWNER")).toBe("Owner");
    expect(formatMemberRole("VIEWER")).toBe("Viewer");

    expect(getPlanQuotaSummary("FREE", 1)).toEqual({
      tierLabel: "Free Tier",
      projectSummary: "1 / 2 projects",
      usagePct: 50,
      retentionDays: 7,
    });
    expect(getPlanQuotaSummary("FREE", 5).usagePct).toBe(100);
    expect(getPlanQuotaSummary("PRO", 3)).toEqual({
      tierLabel: "Pro Tier",
      projectSummary: "3 projects (unlimited)",
      usagePct: 0,
      retentionDays: 90,
    });
    expect(getPlanQuotaSummary("ENTERPRISE", 0)).toEqual({
      tierLabel: "Enterprise Tier",
      projectSummary: "0 projects (unlimited)",
      usagePct: 0,
      retentionDays: 365,
    });
  });

  it("validates org and project form inputs with shared Zod schemas", () => {
    expect(validateCreateOrgInput("Acme QA", "")).toEqual({ ok: true, data: { name: "Acme QA" } });
    expect(validateCreateOrgInput("Acme QA", " acme-qa ")).toEqual({
      ok: true,
      data: { name: "Acme QA", slug: "acme-qa" },
    });
    expect(validateCreateOrgInput("   ", "bad slug!")).toMatchObject({ ok: false });

    expect(validateCreateProjectInput("Web", " ", " ")).toEqual({ ok: true, data: { name: "Web" } });
    expect(validateCreateProjectInput("Web", "web-app", "E2E tests")).toEqual({
      ok: true,
      data: { name: "Web", slug: "web-app", description: "E2E tests" },
    });
    expect(validateCreateProjectInput("", "", "")).toMatchObject({ ok: false });
  });

  it("safely reads and writes localStorage across SSR, browser, and throwing storage", () => {
    expect(readStoredId(STORAGE_ORG_KEY)).toBeNull();
    writeStoredId(STORAGE_ORG_KEY, "org-1");

    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
    });
    writeStoredId(STORAGE_ORG_KEY, "org-1");
    expect(readStoredId(STORAGE_ORG_KEY)).toBe("org-1");
    writeStoredId(STORAGE_ORG_KEY, null);
    expect(readStoredId(STORAGE_ORG_KEY)).toBeNull();

    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
        removeItem: () => {
          throw new Error("denied");
        },
      },
    });
    expect(readStoredId(STORAGE_ORG_KEY)).toBeNull();
    expect(() => writeStoredId(STORAGE_ORG_KEY, "org-2")).not.toThrow();
  });

  it("forwards AbortSignal on list requests and falls back cleanly for unmapped API codes", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const client = createWorkspaceClient({ fetch: fetchMock });

    await client.listOrgs(controller.signal);
    await client.listProjects("org/1", controller.signal);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/orgs",
      expect.objectContaining({ signal: controller.signal }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/orgs/org%2F1/projects",
      expect.objectContaining({ signal: controller.signal }),
    );
    expect(
      formatWorkspaceError(new ApiClientError(429, { code: "RATE_LIMITED", message: "Slow down" }), "Retry later."),
    ).toBe("Retry later.");
    expect(
      formatWorkspaceError(new ApiClientError(401, { code: "UNAUTHENTICATED", message: "Auth" }), "Retry."),
    ).toContain("session has expired");
    expect(
      formatWorkspaceError(new ApiClientError(400, { code: "VALIDATION_ERROR", message: "Bad" }), "Retry."),
    ).toContain("Check the form fields");
  });
});
