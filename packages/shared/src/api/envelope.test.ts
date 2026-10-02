import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiResponse } from "./envelope";

const Response = apiResponse(z.object({ id: z.string() }));

describe("API envelope", () => {
  it("parses a success envelope", () => {
    const parsed = Response.parse({ success: true, data: { id: "r1" }, meta: { cursor: null } });
    expect(parsed.success && parsed.data.id).toBe("r1");
  });

  it("parses a failure envelope with a known error code", () => {
    const parsed = Response.parse({
      success: false,
      error: { code: "NOT_FOUND", message: "Not found", requestId: "req_1" },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown error codes", () => {
    expect(() => Response.parse({ success: false, error: { code: "TEAPOT", message: "?" } })).toThrow();
  });
});
