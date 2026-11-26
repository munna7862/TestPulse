import { z } from "zod";
import { EmailSchema } from "./auth";
import { apiSuccess } from "./envelope";
import { AssignableOrgRoleSchema } from "./orgs";

export const InvitationParamsSchema = z.object({ orgId: z.string(), id: z.string() });
export type InvitationParams = z.infer<typeof InvitationParamsSchema>;

export const CreateInvitationBodySchema = z.object({
  email: EmailSchema,
  role: AssignableOrgRoleSchema,
});
export type CreateInvitationBody = z.infer<typeof CreateInvitationBodySchema>;

export const AcceptInvitationBodySchema = z.object({
  token: z.string(),
});
export type AcceptInvitationBody = z.infer<typeof AcceptInvitationBodySchema>;

export const InvitationSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  email: z.string(),
  role: AssignableOrgRoleSchema,
  invitedById: z.string(),
  invitedByName: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
});
export type Invitation = z.infer<typeof InvitationSchema>;

export const InvitationResponseSchema = apiSuccess(InvitationSchema);
export const InvitationListResponseSchema = apiSuccess(z.array(InvitationSchema));
