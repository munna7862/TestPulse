import { z } from "zod";

export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/**
 * Validates an environment source (e.g. `process.env`) against a Zod schema and fails fast with a
 * readable list of problems. Values are never echoed back, so secrets cannot leak into logs.
 */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => {
    const key = issue.path.join(".") || "(root)";
    return `${key}: ${issue.message}`;
  });
  throw new EnvValidationError(issues);
}

/** Parses "true"/"false"/"1"/"0" strings (env vars) into booleans. */
export const booleanString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

export const DeploymentProfile = z.enum(["free", "paid"]);
export type DeploymentProfile = z.infer<typeof DeploymentProfile>;
