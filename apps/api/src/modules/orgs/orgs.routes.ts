import type { PrismaClient, User } from "@testpulse/db";
import {
  CreateOrgBodySchema,
  ListOrgsQuerySchema,
  OrgListResponseSchema,
  OrgMemberListResponseSchema,
  OrgParamsSchema,
  OrgResponseSchema,
  TransferOwnershipBodySchema,
  UpdateOrgBodySchema,
} from "@testpulse/shared";
import type { FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { ApiEnv } from "../../env";
import { tenantContextOf } from "../../plugins/tenant-context";
import { createAuthMiddleware } from "../auth/auth.middleware";
import { OrgService } from "./orgs.service";

export interface OrgRoutesOptions {
  db: PrismaClient;
  env: ApiEnv;
}

function authUserOf(request: FastifyRequest): User {
  if (!request.authUser) throw request.server.httpErrors.unauthorized("Authentication required.");
  return request.authUser;
}

/**
 * Organization routes (docs/api/rest-api.md §2). Routes under /api/v1/orgs/:orgId get authentication, CSRF and
 * tenant resolution from the tenant-context hook, which registerTenantRouteGuard attaches from ORG_ROUTE_POLICY.
 */
export function orgRoutes({ db, env }: OrgRoutesOptions): FastifyPluginAsyncZod {
  return async (app) => {
    const service = new OrgService(db);
    const auth = createAuthMiddleware(db, env);

    app.post(
      "/api/v1/orgs",
      {
        preValidation: [auth.authenticateUser, auth.validateCsrf, auth.requireVerifiedEmail],
        schema: { body: CreateOrgBodySchema, response: { 201: OrgResponseSchema } },
      },
      async (request, reply) => {
        const org = await service.create(authUserOf(request).id, request.body);
        return reply.code(201).send({ success: true as const, data: org });
      },
    );

    app.get(
      "/api/v1/orgs",
      {
        preValidation: [auth.authenticateUser],
        schema: { querystring: ListOrgsQuerySchema, response: { 200: OrgListResponseSchema } },
      },
      async (request) => ({
        success: true as const,
        data: await service.listForUser(authUserOf(request).id, request.query.slug),
      }),
    );

    app.get(
      "/api/v1/orgs/:orgId",
      { schema: { params: OrgParamsSchema, response: { 200: OrgResponseSchema } } },
      async (request) => ({ success: true as const, data: await service.get(tenantContextOf(request)) }),
    );

    app.patch(
      "/api/v1/orgs/:orgId",
      { schema: { params: OrgParamsSchema, body: UpdateOrgBodySchema, response: { 200: OrgResponseSchema } } },
      async (request) => ({
        success: true as const,
        data: await service.rename(tenantContextOf(request), request.body.name),
      }),
    );

    app.delete("/api/v1/orgs/:orgId", { schema: { params: OrgParamsSchema } }, async (request, reply) => {
      await service.softDelete(tenantContextOf(request));
      return reply.code(204).send();
    });

    app.get(
      "/api/v1/orgs/:orgId/members",
      { schema: { params: OrgParamsSchema, response: { 200: OrgMemberListResponseSchema } } },
      async (request) => ({ success: true as const, data: await service.listMembers(tenantContextOf(request)) }),
    );

    app.post(
      "/api/v1/orgs/:orgId/transfer-ownership",
      {
        schema: { params: OrgParamsSchema, body: TransferOwnershipBodySchema, response: { 200: OrgResponseSchema } },
      },
      async (request) => ({
        success: true as const,
        data: await service.transferOwnership(tenantContextOf(request), request.body.userId),
      }),
    );
  };
}
