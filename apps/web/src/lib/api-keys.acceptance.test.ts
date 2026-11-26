import { API_KEY_LIVE_PREFIX, can } from "@testpulse/shared";
import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";
import {
  buildExpiresAtIso,
  buildReporterSnippet,
  canManageApiKeys,
  createApiKeysClient,
  formatApiKeyError,
} from "./api-keys";

describe("API keys helpers & client acceptance (S-008b)", () => {
  it("[SC-KEY-001] [SC-KEY-002] canManageApiKeys matches shared apiKey.manage permissions for every role", () => {
    expect(canManageApiKeys("OWNER")).toBe(can("OWNER", "apiKey.manage"));
    expect(canManageApiKeys("ADMIN")).toBe(can("ADMIN", "apiKey.manage"));
    expect(canManageApiKeys("MEMBER")).toBe(can("MEMBER", "apiKey.manage"));
    expect(canManageApiKeys("VIEWER")).toBe(can("VIEWER", "apiKey.manage"));
    expect(canManageApiKeys("ADMIN")).toBe(true);
    expect(canManageApiKeys("MEMBER")).toBe(false);
  });

  it("[SC-KEY-001] builds Playwright and Vitest reporter snippets referencing TESTPULSE_API_KEY env var without hardcoding secrets", () => {
    const pw = buildReporterSnippet("playwright", "Core Web");
    expect(pw).toContain("@testpulse/reporter/playwright");
    expect(pw).toContain("process.env.TESTPULSE_API_KEY");
    expect(pw).not.toContain(API_KEY_LIVE_PREFIX);

    const vt = buildReporterSnippet("vitest", "Core Web");
    expect(vt).toContain("@testpulse/reporter/vitest");
    expect(vt).toContain("process.env.TESTPULSE_API_KEY");
    expect(vt).not.toContain(API_KEY_LIVE_PREFIX);
  });

  it("[SC-KEY-001] computes optional expiration ISO timestamps cleanly across presets", () => {
    const base = new Date("2026-11-26T00:00:00.000Z");
    expect(buildExpiresAtIso("never", base)).toBeUndefined();
    expect(buildExpiresAtIso("30d", base)).toBe("2026-12-26T00:00:00.000Z");
    expect(buildExpiresAtIso("90d", base)).toBe("2027-02-24T00:00:00.000Z");
    expect(buildExpiresAtIso("365d", base)).toBe("2027-11-26T00:00:00.000Z");
  });

  it("[SC-KEY-001] [SC-KEY-003] [SC-KEY-004] calls GET, POST, DELETE /api/v1/projects/:projectId/api-keys with Zod parsing and safe errors", async () => {
    const sampleKey = {
      id: "01950000-0000-7000-8000-000000000051",
      orgId: "01950000-0000-7000-8000-000000000001",
      projectId: "01950000-0000-7000-8000-000000000011",
      name: "GitHub Actions",
      prefix: "aaaaaaaa",
      createdById: "01950000-0000-7000-8000-000000000002",
      createdByName: "Ada Admin",
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      status: "ACTIVE" as const,
      createdAt: "2026-11-26T00:00:00.000Z",
    };
    const dummyPlaintext = `${API_KEY_LIVE_PREFIX}${"a".repeat(43)}`;

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: [sampleKey] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { ...sampleKey, plaintextKey: dummyPlaintext } }), {
          status: 201,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = createApiKeysClient({ fetch: fetchMock });

    const list = await client.listApiKeys(sampleKey.projectId);
    expect(list).toEqual([sampleKey]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/v1/projects/${sampleKey.projectId}/api-keys`);

    const created = await client.createApiKey(sampleKey.projectId, { name: "GitHub Actions" });
    expect(created.plaintextKey).toBe(dummyPlaintext);
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");

    await client.revokeApiKey(sampleKey.projectId, sampleKey.id);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(`/api/v1/projects/${sampleKey.projectId}/api-keys/${sampleKey.id}`);
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("DELETE");

    expect(
      formatApiKeyError(new ApiClientError(403, { code: "FORBIDDEN", message: "raw backend string" }), "Fallback"),
    ).toBe("Only organization owners and admins can manage project API keys.");
    expect(
      formatApiKeyError(new ApiClientError(404, { code: "NOT_FOUND", message: "raw backend string" }), "Fallback"),
    ).toBe("This project or API key is no longer available.");
    expect(
      formatApiKeyError(new ApiClientError(400, { code: "VALIDATION_ERROR", message: "raw leak" }), "Fallback"),
    ).toBe("Enter a valid API key name (max 100 characters) and future expiration date.");
    expect(formatApiKeyError(new ApiClientError(500, { code: "INTERNAL", message: "secret pg err" }), "Fallback")).toBe(
      "Fallback",
    );
    expect(formatApiKeyError(new Error("boom"), "Fallback")).toBe("Fallback");
  });
});
