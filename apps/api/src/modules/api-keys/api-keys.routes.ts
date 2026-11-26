import type { PrismaClient } from "@testpulse/db";
import {
  ApiKeyListResponseSchema,
  ApiKeyParamsSchema,
  CreatedApiKeyResponseSchema,
  CreateApiKeyBodySchema,
  ProjectParamsSchema,
} from "@testpulse/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { tenantContextOf } from "../../plugins/tenant-context";
import { ApiKeyService } from "./api-keys.service";

export interface ApiKeyRoutesOptions {
  db: PrismaClient;
  now?: () => Date;
}

/** Project-scoped API key management routes (docs/api/rest-api.md §2, master plan §7). */
export function apiKeyRoutes({ db, now }: ApiKeyRoutesOptions): FastifyPluginAsyncZod {
  return async (app) => {
    const service = new ApiKeyService(db, now);

    app.get(
      "/api/v1/projects/:projectId/api-keys",
      {
        schema: {
          params: ProjectParamsSchema,
          response: { 200: ApiKeyListResponseSchema },
        },
      },
      async (request) => ({
        success: true as const,
        data: await service.list(tenantContextOf(request)),
      }),
    );

    app.post(
      "/api/v1/projects/:projectId/api-keys",
      {
        schema: {
          params: ProjectParamsSchema,
          body: CreateApiKeyBodySchema,
          response: { 201: CreatedApiKeyResponseSchema },
        },
      },
      async (request, reply) => {
        const created = await service.create(tenantContextOf(request), request.body);
        return reply.code(201).send({ success: true as const, data: created });
      },
    );

    app.delete(
      "/api/v1/projects/:projectId/api-keys/:keyId",
      {
        schema: {
          params: ApiKeyParamsSchema,
        },
      },
      async (request, reply) => {
        await service.revoke(tenantContextOf(request), request.params.keyId);
        return reply.code(204).send();
      },
    );
  };
}
