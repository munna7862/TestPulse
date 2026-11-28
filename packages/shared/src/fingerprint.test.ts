import { expect, it } from "vitest";
import { fingerprintTest, TestFingerprintInputSchema } from "./fingerprint";

it("rejects the reserved fingerprint separator within an identity field", async () => {
  await expect(fingerprintTest({ filePath: "tests/a.spec.ts", titlePath: ["a\0b"] })).rejects.toThrow(/NUL/);
});

it("keeps the ADR separator before an empty title path", async () => {
  await expect(
    fingerprintTest({ runnerProject: "chromium", filePath: "tests/a.spec.ts", titlePath: [] }),
  ).resolves.toBe("af42a16e1944883ae2a40a1f2e04b891ff4c3ba791c3d94caeaa082f2c6763d7");
});

const identity = { filePath: "tests/a.spec.ts", titlePath: ["works"] };

it.each([
  { ...identity, filePath: "tests/\uD800.spec.ts" },
  { ...identity, titlePath: ["works\uD800"] },
  { ...identity, runnerProject: "chromium\uDC00" },
])("rejects unpaired surrogates before UTF-8 encoding (%j)", async (input) => {
  expect(TestFingerprintInputSchema.safeParse(input).success).toBe(false);
  await expect(fingerprintTest(input)).rejects.toThrow(/well-formed Unicode/);
});

it("accepts supplementary characters and the literal replacement character", async () => {
  const supplementary = fingerprintTest({ ...identity, titlePath: ["works\u{1F680}"] });
  const replacement = fingerprintTest({ ...identity, titlePath: ["works\uFFFD"] });
  await expect(supplementary).resolves.toMatch(/^[a-f0-9]{64}$/);
  await expect(replacement).resolves.not.toBe(await supplementary);
});

it("rejects empty title segments that would share the empty title path payload", async () => {
  const input = { ...identity, titlePath: [""] };
  expect(TestFingerprintInputSchema.safeParse(input).success).toBe(false);
  await expect(fingerprintTest(input)).rejects.toThrow(/title segments must not be empty/);
});
