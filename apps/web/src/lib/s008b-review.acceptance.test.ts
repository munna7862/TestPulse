import { API_KEY_LIVE_PREFIX } from "@testpulse/shared";
import { describe, expect, it, vi } from "vitest";
import { buildReporterSnippet, createApiKeysClient, formatApiKeyError, validateApiKeyName } from "./api-keys";
import { ApiError as AuthApiError } from "./auth-client";

describe("S-008b Round 1 review coverage — API keys helpers & client", () => {
  it("[SC-KEY-001] validateApiKeyName enforces non-empty, length limit, and control-character checks", () => {
    expect(validateApiKeyName("GitHub Actions CI")).toBeNull();
    expect(validateApiKeyName("")).toBeTypeOf("string");
    expect(validateApiKeyName("   ")).toBeTypeOf("string");
    expect(validateApiKeyName("a".repeat(101))).toBeTypeOf("string");
    expect(validateApiKeyName("CI\u0000Key")).toBeTypeOf("string");
    expect(validateApiKeyName("CI\nKey")).toBeTypeOf("string");
  });

  it("[SC-KEY-003] formatApiKeyError maps AuthApiError codes to safe copy and shields unknown or non-Error throws", () => {
    const fallback = "Safe fallback message";
    expect(formatApiKeyError(new AuthApiError("FORBIDDEN", "internal detail", 403), fallback)).toBe(
      "Only organization owners and admins can manage project API keys.",
    );
    expect(formatApiKeyError(new AuthApiError("NOT_FOUND", "missing", 404), fallback)).toBe(
      "This project or API key is no longer available.",
    );
    expect(formatApiKeyError(new AuthApiError("UNKNOWN_CODE", "raw backend detail", 500), fallback)).toBe(fallback);
    expect(formatApiKeyError(new Error("raw sqlite error"), fallback)).toBe(fallback);
    expect(formatApiKeyError("boom", fallback)).toBe(fallback);
    expect(formatApiKeyError(null, fallback)).toBe(fallback);
    expect(formatApiKeyError({ code: "FORBIDDEN" }, fallback)).toBe(fallback);
  });

  it("[SC-KEY-001] createApiKey posts trimmed payload to /api/v1/projects/:projectId/api-keys and parses CreatedApiKey", async () => {
    const projectId = "01950000-0000-7000-8000-000000000011";
    const dummyPlaintext = `${API_KEY_LIVE_PREFIX}${"a".repeat(43)}`;
    const payload = {
      id: "01950000-0000-7000-8000-000000000199",
      orgId: "01950000-0000-7000-8000-000000000001",
      projectId,
      name: "Nightly Runner",
      prefix: "aaaaaaaa",
      createdById: "01950000-0000-7000-8000-000000000021",
      createdByName: "Ada Admin",
      lastUsedAt: null,
      expiresAt: "2027-01-01T00:00:00.000Z",
      revokedAt: null,
      status: "ACTIVE" as const,
      createdAt: "2026-11-26T00:00:00.000Z",
      plaintextKey: dummyPlaintext,
    };

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: payload }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = createApiKeysClient({ baseUrl: "http://api.test", fetch: fetchMock });
    const created = await client.createApiKey(projectId, {
      name: "Nightly Runner",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });

    expect(created).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`http://api.test/api/v1/projects/${projectId}/api-keys`);
    expect(init?.method).toBe("POST");
    expect(typeof init?.body).toBe("string");
    expect(JSON.parse(init?.body as string)).toEqual({
      name: "Nightly Runner",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });
  });

  it("[SC-KEY-001] buildReporterSnippet neutralizes CR, LF, LS (\\u2028) and PS (\\u2029) line breaks in project names", () => {
    const snippet = buildReporterSnippet("playwright", "Core\rWeb\nLine\u2028Sep\u2029End");
    expect(snippet.startsWith("// Configure @testpulse/reporter for Core Web Line Sep End\n")).toBe(true);
    expect(snippet).not.toMatch(/[\u2028\u2029]/);
  });
});
