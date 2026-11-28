import { expect, it } from "vitest";
import { fingerprintTest } from "./fingerprint";

it("rejects the reserved fingerprint separator within an identity field", async () => {
  await expect(fingerprintTest({ filePath: "tests/a.spec.ts", titlePath: ["a\0b"] })).rejects.toThrow(/NUL/);
});

it("keeps the ADR separator before an empty title path", async () => {
  await expect(
    fingerprintTest({ runnerProject: "chromium", filePath: "tests/a.spec.ts", titlePath: [] }),
  ).resolves.toBe("af42a16e1944883ae2a40a1f2e04b891ff4c3ba791c3d94caeaa082f2c6763d7");
});
