import { apiSuccess, type DependencyStatus, HealthSchema } from "@testpulse/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export interface HealthDependencies {
  /** Returns the database status; `not_configured` until P02-S03 wires PostgreSQL. */
  database: () => Promise<DependencyStatus>;
  /** Returns the Redis status; `not_configured` until P02-S03 wires Redis. */
  redis: () => Promise<DependencyStatus>;
  commit?: string | undefined;
}

export function healthRoutes(deps: HealthDependencies): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      "/health",
      { schema: { response: { 200: apiSuccess(HealthSchema), 503: apiSuccess(HealthSchema) } } },
      async (_request, reply) => {
        const [database, redis] = await Promise.all([deps.database(), deps.redis()]);
        const degraded = database === "down" || redis === "down";
        return reply.status(database === "down" ? 503 : 200).send({
          success: true,
          data: {
            status: degraded ? "degraded" : "ok",
            service: "api",
            ...(deps.commit ? { commit: deps.commit.slice(0, 12) } : {}),
            uptimeSeconds: Math.round(process.uptime()),
            dependencies: { database, redis },
          },
        });
      },
    );
  };
}
