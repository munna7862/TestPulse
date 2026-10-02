import { describe, expect, it } from "vitest";
import { z } from "zod";
import { booleanString, EnvValidationError, parseEnv } from "./parse-env";

const Schema = z.object({
  PORT: z.coerce.number().int().positive(),
  SECRET: z.string().min(8),
  FLAG: booleanString.default(false),
});

describe("parseEnv", () => {
  it("returns typed values for a valid environment", () => {
    const env = parseEnv(Schema, { PORT: "4000", SECRET: "abcdefgh", FLAG: "1" });
    expect(env).toEqual({ PORT: 4000, SECRET: "abcdefgh", FLAG: true });
  });

  it("lists every invalid key and never echoes values", () => {
    try {
      parseEnv(Schema, { PORT: "not-a-number", SECRET: "tiny" });
      expect.unreachable("parseEnv should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const message = (error as EnvValidationError).message;
      expect(message).toContain("PORT");
      expect(message).toContain("SECRET");
      expect(message).not.toContain("tiny");
    }
  });

  it("applies defaults for optional booleans", () => {
    expect(parseEnv(Schema, { PORT: "1", SECRET: "abcdefgh" }).FLAG).toBe(false);
  });
});
