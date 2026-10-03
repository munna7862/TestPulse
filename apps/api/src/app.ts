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
import type { RateLimitStore } from "./modules/auth/rate-limiter";
import { OAuthService, oauthRoutes } from "./modules/auth/oauth";
import { orgRoutes } from "./modules/orgs";
import { registerErrorHandling } from "./plugins/error-handler";
import { createTenantContextHook, registerTenantRouteGuard } from "./plugins/tenant-context";
import { type HealthDependencies, healthRoutes } from "./routes/health";

export interface BuildAppOptions {
  env: ApiEnv;
  health?: Partial<HealthDependencies>;
  db?: PrismaClient;
  mailer?: Mailer;
  /** Disable request logging in tests. */
  logger?: boolean;
  /** Auth rate-limit counters. server.ts passes a Redis store; defaults to per-process memory. */
  rateLimitStore?: RateLimitStore;
}

export async function buildApp({
  env,
  health,
  db: injectedDb,
  mailer: injectedMailer,
  logger = true,
  rateLimitStore,
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
    // A hop count trusts that many proxies counted from the socket peer (proxy-addr semantics), so the client IP
    // is the entry the outermost trusted proxy appended, never one the client wrote (security model §5).
    trustProxy:
      typeof env.TRUST_PROXY === "number"
        ? (_address: string, hop: number) => hop < (env.TRUST_PROXY as number)
        : env.TRUST_PROXY,
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

  let activeDb: PrismaClient | undefined = injectedDb;
  if (!activeDb && env.DATABASE_URL) {
    try {
      activeDb = getSystemDb();
    } catch {
      // Ignore if not configured
    }
  }

  // Before any route: every route under /api/v1/orgs/:orgId must be in the isolation table (master plan §7.2).
  registerTenantRouteGuard(app, activeDb ? createTenantContextHook(activeDb, env) : undefined);

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

  if (activeDb) {
    const mailer = injectedMailer ?? new ConsoleMailer({ revealSecrets: env.NODE_ENV !== "production" });
    if (!injectedMailer && env.NODE_ENV === "production") {
      app.log.warn("No mail transport configured: verification and reset emails are not delivered (task.md G9)");
    }
    const authService = new AuthService({
      db: activeDb,
      mailer,
      jwtSign: (payload) => app.jwt.sign(payload, { expiresIn: "15m" }),
      env,
      onMailError: (error) => app.log.error({ err: error }, "background mail delivery failed"),
    });

    if (!rateLimitStore && env.NODE_ENV === "production") {
      app.log.warn("REDIS_URL is not set: auth rate limits are per process and reset on restart");
    }
    await app.register(authRoutes({ authService, env, ...(rateLimitStore ? { rateLimitStore } : {}) }), {
      prefix: "/api/v1/auth",
    });
    await app.register(oauthRoutes({ authService, oauthService: new OAuthService(activeDb), env }));
    await app.register(orgRoutes({ db: activeDb, env }));
  }

  return app;
}
