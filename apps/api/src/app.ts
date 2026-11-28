import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { getSystemDb, type PrismaClient } from "@testpulse/db";
import Fastify, { LogController, type FastifyInstance, type FastifyRequest } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import type { ApiEnv } from "./env";
import { ConsoleMailer, type Mailer } from "./lib/mailer";
import { LOG_REDACT_PATHS, redactRequestUrl } from "./log-redaction";
import { AuthService, authRoutes } from "./modules/auth";
import { MemoryRateLimitStore, type RateLimitStore } from "./modules/auth/rate-limiter";
import { OAuthService, oauthRoutes } from "./modules/auth/oauth";
import { apiKeyRoutes } from "./modules/api-keys";
import { invitationRoutes } from "./modules/invitations";
import { orgRoutes } from "./modules/orgs";
import { projectRoutes } from "./modules/projects";
import { registerErrorHandling } from "./plugins/error-handler";
import { createTenantContextHook, registerTenantRouteGuard } from "./plugins/tenant-context";
import { registerVerifiedProxy } from "./plugins/verified-proxy";
import type { QueueClient } from "./queues/registry";
import { type HealthDependencies, healthRoutes } from "./routes/health";

export interface BuildAppOptions {
  env: ApiEnv;
  health?: Partial<HealthDependencies>;
  db?: PrismaClient;
  mailer?: Mailer;
  /** Disable request logging in tests. */
  logger?: boolean;
  /** Optional log stream override (primarily for request logging tests). */
  loggerStream?: NodeJS.WritableStream;
  /** Optional observer invoked for every non-HEAD HTTP route registered on the instance. */
  onRoute?: (route: { method: string; url: string }) => void;
  /** Shared rate-limit counters. server.ts supplies Redis in hosted environments. */
  rateLimitStore?: RateLimitStore;
  /** Producer queue client for async background jobs (e.g. soft-delete purge). */
  queueClient?: QueueClient;
}

export async function buildApp({
  env,
  health,
  db: injectedDb,
  mailer: injectedMailer,
  logger = true,
  loggerStream,
  onRoute,
  rateLimitStore = new MemoryRateLimitStore(),
  queueClient,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger
      ? {
          level: env.LOG_LEVEL,
          ...(loggerStream ? { stream: loggerStream } : {}),
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
    logController: new LogController({ requestIdLogLabel: "requestId" }),
    genReqId: () => `req_${crypto.randomUUID()}`,
  }).withTypeProvider<ZodTypeProvider>();

  if (onRoute) {
    app.addHook("onRoute", (route) => {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      for (const method of methods) {
        onRoute({ method, url: route.url });
      }
    });
  }

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  await app.register(sensible);
  registerErrorHandling(app);
  registerVerifiedProxy(app, env.WEB_PROXY_SHARED_SECRET);

  let activeDb: PrismaClient | undefined = injectedDb;
  if (!activeDb && env.DATABASE_URL) {
    try {
      activeDb = getSystemDb();
    } catch {
      // Ignore if not configured
    }
  }

  // Before any route: every route under /api/v1/orgs/:orgId must be in the isolation table (master plan §7.2).
  registerTenantRouteGuard(app, activeDb ? createTenantContextHook(activeDb, env, rateLimitStore) : undefined);

  await app.register(cookie);
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    cookie: {
      cookieName: "tp_access",
      signed: false,
    },
  });

  await app.register(helmet, { contentSecurityPolicy: false, strictTransportSecurity: env.NODE_ENV === "production" });
  const webOrigin = new URL(env.WEB_ORIGIN).origin;
  await app.register(cors, {
    origin: (origin, callback) => callback(null, origin === webOrigin),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
    strictPreflight: true,
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

    await app.register(authRoutes({ authService, env, rateLimitStore }), {
      prefix: "/api/v1/auth",
    });
    await app.register(oauthRoutes({ authService, oauthService: new OAuthService(activeDb), env, rateLimitStore }));
    const onEnqueueError = (error: unknown) => app.log.error({ err: error }, "failed to enqueue background job");
    const onMailError = (error: unknown) => app.log.error({ err: error }, "background mail delivery failed");
    await app.register(
      orgRoutes({ db: activeDb, env, rateLimitStore, ...(queueClient ? { queueClient, onEnqueueError } : {}) }),
    );
    await app.register(projectRoutes({ db: activeDb, ...(queueClient ? { queueClient, onEnqueueError } : {}) }));
    await app.register(apiKeyRoutes({ db: activeDb }));
    await app.register(
      invitationRoutes({
        db: activeDb,
        mailer,
        env,
        onMailError,
        rateLimitStore,
        ...(queueClient ? { queueClient, onEnqueueError } : {}),
      }),
    );
  }

  return app;
}
