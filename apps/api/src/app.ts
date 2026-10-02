import sensible from "@fastify/sensible";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import type { ApiEnv } from "./env";
import { LOG_REDACT_PATHS } from "./log-redaction";
import { registerErrorHandling } from "./plugins/error-handler";
import { type HealthDependencies, healthRoutes } from "./routes/health";

export interface BuildAppOptions {
  env: ApiEnv;
  health?: Partial<HealthDependencies>;
  /** Disable request logging in tests. */
  logger?: boolean;
}

export async function buildApp({ env, health, logger = true }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ? { level: env.LOG_LEVEL, redact: { paths: LOG_REDACT_PATHS, censor: "[REDACTED]" } } : false,
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 1_048_576,
    requestIdHeader: "x-request-id",
    genReqId: () => `req_${crypto.randomUUID()}`,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  await app.register(sensible);
  registerErrorHandling(app);

  const notConfigured = async () => "not_configured" as const;
  await app.register(
    healthRoutes({
      database: health?.database ?? notConfigured,
      redis: health?.redis ?? notConfigured,
      commit: health?.commit ?? env.GIT_COMMIT_SHA,
    }),
  );

  return app;
}
