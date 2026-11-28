import { z } from "zod";

export const TestFingerprintInputSchema = z.object({
  filePath: z.string(),
  titlePath: z.array(z.string()),
  runnerProject: z.string().optional(),
});

/** ADR-007 takes paths relative to the repository root. Preserve path case. */
export function normalizeTestFilePath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^(?:\.\/)+/, "");
}

/** Hash the canonical, NUL-separated test identity identically in Node and browsers. */
export async function fingerprintTest(input: z.infer<typeof TestFingerprintInputSchema>): Promise<string> {
  const runnerProject = input.runnerProject ?? "";
  const filePath = normalizeTestFilePath(input.filePath);
  if ([runnerProject, filePath, ...input.titlePath].some((field) => field.includes("\0"))) {
    throw new TypeError("Test identity fields must not contain NUL characters.");
  }
  const payload = `${runnerProject}\0${filePath}\0${input.titlePath.join("\0")}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
