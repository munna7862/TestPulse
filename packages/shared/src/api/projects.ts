import { z } from "zod";
import { apiSuccess } from "./envelope";
import { hasNoControlChars, hasNoNul, OrgRoleSchema, OrgSlugSchema } from "./orgs";

/** Project ids are UUIDs (uuid v7 from Prisma). */
export const ProjectIdSchema = z.uuid();

export const ProjectParamsSchema = z.object({ projectId: z.string() });

export const ProjectNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must not exceed 100 characters")
  .refine(hasNoControlChars, { message: "Name must not contain control characters" });

/** Free text: line breaks are fine, NUL is not (Postgres cannot store it). */
export const ProjectDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Description must not exceed 500 characters")
  .refine(hasNoNul, { message: "Description must not contain NUL characters" });

/** Git branch names: no whitespace or control characters (git check-ref-format, simplified). */
export const BranchNameSchema = z
  .string()
  .min(1, "Branch is required")
  .max(255)
  .regex(/^[^\s~^:?*[\\]+$/, "Not a valid branch name")
  .refine(hasNoControlChars, { message: "Not a valid branch name" });

/** Allowed quarantine SLAs in days (glossary: 7/14/30/60). */
export const SlaDaysSchema = z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(60)]);

/** Requested retention; the effective value is `min(retentionDays, plan maximum)` (master plan §8). */
export const RetentionDaysSchema = z.number().int().min(1).max(365);

export const CreateProjectBodySchema = z.object({
  name: ProjectNameSchema,
  slug: OrgSlugSchema.optional(),
  description: ProjectDescriptionSchema.optional(),
});
export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;

/**
 * Editable settings. Strict: unknown keys (including the flaky settings, editable from P06-S01, and `slug`) are
 * rejected with 400 rather than silently ignored. At least one field is required.
 */
export const UpdateProjectBodySchema = z
  .strictObject({
    name: ProjectNameSchema.optional(),
    description: ProjectDescriptionSchema.nullable().optional(),
    defaultBranch: BranchNameSchema.optional(),
    slaDays: SlaDaysSchema.optional(),
    retentionDays: RetentionDaysSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Provide at least one field to update" });
export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>;

export const ListProjectsQuerySchema = z.object({ slug: OrgSlugSchema.optional() });
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;

/** A project with its settings, as seen by one member: `role` is the caller's org role. */
export const ProjectSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  defaultBranch: z.string(),
  slaDays: z.number().int(),
  retentionDays: z.number().int(),
  flakyWindow: z.number().int(),
  flakyThreshold: z.number().int(),
  trackedBranches: z.array(z.string()),
  role: OrgRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ProjectResponseSchema = apiSuccess(ProjectSchema);
export const ProjectListResponseSchema = apiSuccess(z.array(ProjectSchema));
