import { z } from "zod";
import { PlanTierSchema } from "../plans";
import { apiSuccess } from "./envelope";

/** Org-level roles (master plan §7.1), lowest to highest privilege. */
export const OrgRoleSchema = z.enum(["VIEWER", "MEMBER", "ADMIN", "OWNER"]);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

const ROLE_RANK: Record<OrgRole, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

/** Whether `role` meets the minimum role `required`. */
export function hasOrgRole(role: OrgRole, required: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** Every role that meets the minimum role `required`. */
export function rolesAtLeast(required: OrgRole): OrgRole[] {
  return OrgRoleSchema.options.filter((role) => hasOrgRole(role, required));
}

/** True when `text` has no ASCII control characters (Postgres rejects NUL; the rest never belong in a name). */
export function hasNoControlChars(text: string): boolean {
  return [...text].every((char) => char.charCodeAt(0) > 0x1f && char.charCodeAt(0) !== 0x7f);
}

/** True when `text` has no NUL byte, which Postgres cannot store in a text column. */
export function hasNoNul(text: string): boolean {
  return !text.includes(String.fromCharCode(0));
}

export const OrgNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must not exceed 100 characters")
  .refine(hasNoControlChars, { message: "Name must not contain control characters" });

export const OrgSlugSchema = z
  .string()
  .min(1)
  .max(48, "Slug must not exceed 48 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits and single hyphens");

/** Derives a URL slug from a display name; falls back to `fallback` when nothing usable remains. */
export function slugify(name: string, fallback = "org"): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return slug || fallback;
}

/** Org ids are UUIDs (uuid v7 from Prisma). */
export const OrgIdSchema = z.uuid();

export const OrgParamsSchema = z.object({ orgId: z.string() });

export const CreateOrgBodySchema = z.object({
  name: OrgNameSchema,
  slug: OrgSlugSchema.optional(),
});
export type CreateOrgBody = z.infer<typeof CreateOrgBodySchema>;

export const UpdateOrgBodySchema = z.object({ name: OrgNameSchema });
export type UpdateOrgBody = z.infer<typeof UpdateOrgBodySchema>;

export const ListOrgsQuerySchema = z.object({ slug: OrgSlugSchema.optional() });
export type ListOrgsQuery = z.infer<typeof ListOrgsQuerySchema>;

export const TransferOwnershipBodySchema = z.object({ userId: z.string().min(1).max(64) });
export type TransferOwnershipBody = z.infer<typeof TransferOwnershipBodySchema>;

/** An organization as seen by one member: `role` is the caller's role in it. */
export const OrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  planTier: PlanTierSchema,
  role: OrgRoleSchema,
  createdAt: z.string(),
});
export type Org = z.infer<typeof OrgSchema>;

export const OrgMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: OrgRoleSchema,
  joinedAt: z.string(),
});
export type OrgMember = z.infer<typeof OrgMemberSchema>;

export const OrgResponseSchema = apiSuccess(OrgSchema);
export const OrgListResponseSchema = apiSuccess(z.array(OrgSchema));
export const OrgMemberListResponseSchema = apiSuccess(z.array(OrgMemberSchema));
