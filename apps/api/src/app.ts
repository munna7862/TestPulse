import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { getSystemDb, type PrismaClient } from "@testpulse/db";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import type { ApiEnv } from "./env";
import { ConsoleMailer, type Mailer } from "./lib/mailer";
import { LOG_REDACT_PATHS, redactRequestUrl } from "./log-redaction";
import { AuthService, authRoutes } from "./modules/auth";
import { OAuthService, oauthRoutes } from "./modules/auth/oauth";
import { registerErrorHandling } from "./plugins/error-handler";
import { type HealthDependencies, healthRoutes } from "./routes/health";

export interface BuildAppOptions {
  env: ApiEnv;
  health?: Partial<HealthDependencies>;
  db?: PrismaClient;
  mailer?: Mailer;
  /** Disable request logging in tests. */
  logger?: boolean;
}

export async function buildApp({
  env,
  health,
  db: injectedDb,
  mailer: injectedMailer,
  logger = true,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger
      ? {
          level: env.LOG_LEVEL,
          redact: { paths: LOG_REDACT_PATHS, censor: "[REDACTED]" },
          serializers: {
            // Same shape as the Fastify default, minus secret-bearing query strings (OAuth code and state).
            req: (request: FastifyRequest) => ({
              method: request.method,
              url: redactRequestUrl(request.url),
              host: request.host,
              remoteAddress: request.ip,
              remotePort: request.socket.remotePort,
            }),
          },
        }
      : false,
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

  await app.register(cookie);
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: {
      cookieName: "tp_access",
      signed: false,
    },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);
      const allowed = new Set([
        env.WEB_ORIGIN.replace(/\/$/, ""),
        `http://${env.HOST}:${env.PORT}`,
        `http://localhost:${env.PORT}`,
        `http://127.0.0.1:${env.PORT}`,
      ]);
      cb(null, allowed.has(origin.replace(/\/$/, "")));
    },
    credentials: true,
  });

  const notConfigured = async () => "not_configured" as const;
  await app.register(
    healthRoutes({
      database: health?.database ?? notConfigured,
      redis: health?.redis ?? notConfigured,
      commit: health?.commit ?? env.GIT_COMMIT_SHA,
    }),
  );

  let activeDb: PrismaClient | undefined = injectedDb;
  if (!activeDb && env.DATABASE_URL) {
    try {
      activeDb = getSystemDb();
    } catch {
      // Ignore if not configured
    }
  }

  if (activeDb) {
    const mailer = injectedMailer ?? new ConsoleMailer();
    const authService = new AuthService({
      db: activeDb,
      mailer,
      jwtSign: (payload) => app.jwt.sign(payload, { expiresIn: "15m" }),
      env,
    });

    await app.register(authRoutes({ authService, env }), { prefix: "/api/v1/auth" });
    await app.register(oauthRoutes({ authService, oauthService: new OAuthService(activeDb), env }));
  }

  return app;
}
