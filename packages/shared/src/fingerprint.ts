import { z } from "zod";

const fingerprintField = z
  .string()
  .refine((value) => !value.includes("\0"), "Test identity fields must not contain NUL characters.")
  // In Unicode mode, paired surrogates match as one supplementary code point.
  .refine((value) => !/[\uD800-\uDFFF]/u.test(value), "Test identity fields must contain well-formed Unicode.");

export const TestFingerprintInputSchema = z.object({
  filePath: fingerprintField,
  titlePath: z.array(fingerprintField.min(1, "Test title segments must not be empty.")),
  runnerProject: fingerprintField.optional(),
});

/** ADR-007 takes paths relative to the repository root. Preserve path case. */
export function normalizeTestFilePath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^(?:\.\/)+/, "");
}

/** Hash the canonical, NUL-separated test identity identically in Node and browsers. */
export async function fingerprintTest(input: z.infer<typeof TestFingerprintInputSchema>): Promise<string> {
  const parsed = TestFingerprintInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new TypeError(parsed.error.issues[0]?.message);
  }
  const { filePath, titlePath, runnerProject = "" } = parsed.data;
  const payload = `${runnerProject}\0${normalizeTestFilePath(filePath)}\0${titlePath.join("\0")}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
