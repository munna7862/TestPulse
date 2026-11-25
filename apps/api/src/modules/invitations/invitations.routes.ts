import type { PrismaClient, User } from "@testpulse/db";
import {
  AcceptInvitationBodySchema,
  CreateInvitationBodySchema,
  InvitationListResponseSchema,
  InvitationParamsSchema,
  InvitationResponseSchema,
  OrgParamsSchema,
  OrgResponseSchema,
} from "@testpulse/shared";
import type { FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { ApiEnv } from "../../env";
import type { Mailer } from "../../lib/mailer";
import { tenantContextOf } from "../../plugins/tenant-context";
import type { QueueClient } from "../../queues/registry";
import { createAuthMiddleware } from "../auth/auth.middleware";
import { byIp, MemoryRateLimitStore, type RateLimitStore, rateLimitHook } from "../auth/rate-limiter";
import { InvitationService } from "./invitations.service";

export interface InvitationRoutesOptions {
  db: PrismaClient;
  mailer: Mailer;
  env: ApiEnv;
  queueClient?: QueueClient;
  rateLimitStore?: RateLimitStore;
  onEnqueueError?: (error: unknown) => void;
  onMailError?: (error: unknown) => void;
}

function authUserOf(request: FastifyRequest): User {
  if (!request.authUser) throw request.server.httpErrors.unauthorized("Authentication required.");
  return request.authUser;
}

/**
 * Team invitation routes (docs/api/rest-api.md §2). Org-scoped management routes use the tenant-context
 * guard (`ORG_ROUTE_POLICY`); `POST /api/v1/invitations/accept` authenticates the verified user via session
 * cookies + CSRF + per-IP rate limiting.
 */
export function invitationRoutes({
  db,
  mailer,
  env,
  queueClient,
  rateLimitStore = new MemoryRateLimitStore(),
  onEnqueueError,
  onMailError,
}: InvitationRoutesOptions): FastifyPluginAsyncZod {
  return async (app) => {
    const service = new InvitationService({
      db,
      mailer,
      env,
      ...(queueClient ? { queueClient } : {}),
      ...(onEnqueueError ? { onEnqueueError } : {}),
      ...(onMailError ? { onMailError } : {}),
    });
    const auth = createAuthMiddleware(db, env);
    const limitAccept = rateLimitHook(rateLimitStore, [
      { bucket: "invite-accept", max: 20, windowMs: 60 * 60_000, key: byIp },
    ]);

    app.get(
      "/api/v1/orgs/:orgId/invitations",
      { schema: { params: OrgParamsSchema, response: { 200: InvitationListResponseSchema } } },
      async (request) => ({ success: true as const, data: await service.list(tenantContextOf(request)) }),
    );

    app.post(
      "/api/v1/orgs/:orgId/invitations",
      {
        schema: {
          params: OrgParamsSchema,
          body: CreateInvitationBodySchema,
          response: { 201: InvitationResponseSchema },
        },
      },
      async (request, reply) => {
        const user = authUserOf(request);
        const invitation = await service.create(tenantContextOf(request), user.name, request.body);
        return reply.code(201).send({ success: true as const, data: invitation });
      },
    );

    app.post(
      "/api/v1/orgs/:orgId/invitations/:id/resend",
      { schema: { params: InvitationParamsSchema, response: { 200: InvitationResponseSchema } } },
      async (request) => {
        const user = authUserOf(request);
        const invitation = await service.resend(tenantContextOf(request), user.name, request.params.id);
        return { success: true as const, data: invitation };
      },
    );

    app.delete(
      "/api/v1/orgs/:orgId/invitations/:id",
      { schema: { params: InvitationParamsSchema } },
      async (request, reply) => {
        await service.revoke(tenantContextOf(request), request.params.id);
        return reply.code(204).send();
      },
    );

    app.post(
      "/api/v1/invitations/accept",
      {
        preValidation: [auth.authenticateUser, auth.validateCsrf, auth.requireVerifiedEmail],
        preHandler: limitAccept,
        schema: { body: AcceptInvitationBodySchema, response: { 200: OrgResponseSchema } },
      },
      async (request) => ({
        success: true as const,
        data: await service.accept(authUserOf(request), request.body.token),
      }),
    );
  };
}
