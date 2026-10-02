import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiClientError, createApiClient } from "./api-client";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("api client", () => {
  it("returns typed data for a success envelope and sends cookies", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { success: true, data: { id: "p1" } }));
    const request = createApiClient({ fetch: fetchMock });

    const data = await request({ path: "/api/v1/projects/p1", schema: z.object({ id: z.string() }) });

    expect(data).toEqual({ id: "p1" });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/projects/p1", expect.objectContaining({ credentials: "include" }));
  });

  it("throws ApiClientError with the shared error code", async () => {
    const request = createApiClient({
      fetch: async () => jsonResponse(404, { success: false, error: { code: "NOT_FOUND", message: "Not found", requestId: "req_1" } }),
    });

    await expect(request({ path: "/api/v1/x", schema: z.object({}) })).rejects.toMatchObject({
      status: 404,
      error: { code: "NOT_FOUND", requestId: "req_1" },
    });
  });

  it("treats unexpected payloads as INTERNAL errors", async () => {
    const request = createApiClient({ fetch: async () => new Response("<html>bad gateway</html>", { status: 502 }) });

    const promise = request({ path: "/api/v1/x", schema: z.object({}) });
    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({ status: 502, error: { code: "INTERNAL" } });
  });
});
