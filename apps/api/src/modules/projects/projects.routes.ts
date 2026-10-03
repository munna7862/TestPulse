import type { PrismaClient } from "@testpulse/db";
import {
  CreateProjectBodySchema,
  ListProjectsQuerySchema,
  OrgParamsSchema,
  ProjectListResponseSchema,
  ProjectParamsSchema,
  ProjectResponseSchema,
  UpdateProjectBodySchema,
} from "@testpulse/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { tenantContextOf } from "../../plugins/tenant-context";
import { ProjectService } from "./projects.service";

export interface ProjectRoutesOptions {
  db: PrismaClient;
}

/**
 * Project routes (docs/api/rest-api.md §2). Authentication, CSRF and tenant resolution come from the tenant-context
 * hook that registerTenantRouteGuard attaches from ORG_ROUTE_POLICY and PROJECT_ROUTE_POLICY.
 */
export function projectRoutes({ db }: ProjectRoutesOptions): FastifyPluginAsyncZod {
  return async (app) => {
    const service = new ProjectService(db);

    app.get(
      "/api/v1/orgs/:orgId/projects",
      {
        schema: {
          params: OrgParamsSchema,
          querystring: ListProjectsQuerySchema,
          response: { 200: ProjectListResponseSchema },
        },
      },
      async (request) => ({
        success: true as const,
        data: await service.listForOrg(tenantContextOf(request), request.query.slug),
      }),
    );

    app.post(
      "/api/v1/orgs/:orgId/projects",
      { schema: { params: OrgParamsSchema, body: CreateProjectBodySchema, response: { 201: ProjectResponseSchema } } },
      async (request, reply) => {
        const project = await service.create(tenantContextOf(request), request.body);
        return reply.code(201).send({ success: true as const, data: project });
      },
    );

    app.get(
      "/api/v1/projects/:projectId",
      { schema: { params: ProjectParamsSchema, response: { 200: ProjectResponseSchema } } },
      async (request) => ({ success: true as const, data: await service.get(tenantContextOf(request)) }),
    );

    app.patch(
      "/api/v1/projects/:projectId",
      {
        schema: {
          params: ProjectParamsSchema,
          body: UpdateProjectBodySchema,
          response: { 200: ProjectResponseSchema },
        },
      },
      async (request) => ({
        success: true as const,
        data: await service.update(tenantContextOf(request), request.body),
      }),
    );

    app.delete("/api/v1/projects/:projectId", { schema: { params: ProjectParamsSchema } }, async (request, reply) => {
      await service.softDelete(tenantContextOf(request));
      return reply.code(204).send();
    });
  };
}
