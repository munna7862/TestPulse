import rateLimit from "@fastify/rate-limit";
import {
  apiSuccess,
  ListOAuthAccountsResponseSchema,
  OAuthAccountParamsSchema,
  OAuthCallbackQuerySchema,
  type OAuthErrorCode,
  OAuthProviderParamsSchema,
  OAuthProviderSchema,
  type OAuthProvider,
  OAuthStartQuerySchema,
  sanitizeReturnTo,
  StartOAuthLinkResponseSchema,
  UnlinkOAuthAccountResponseSchema,
} from "@testpulse/shared";
import { generateCodeVerifier, generateState } from "arctic";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { ApiEnv } from "../../../env";
import { registerAuthErrorHandler } from "../auth-error-handler";
import { createAuthMiddleware } from "../auth.middleware";
import { AuthError, type AuthService } from "../auth.service";
import { setAuthCookies } from "../tokens";
import { OAuthFlowError, type OAuthService } from "./oauth.service";
import { createProviderClient, type OAuthProviderClient, ProviderError } from "./providers";
import { clearStateCookie, createStateCodec, OAUTH_STATE_COOKIE_NAME, safeEqual, setStateCookie } from "./state-cookie";

export interface OAuthRoutesOptions {
  authService: AuthService;
  oauthService: OAuthService;
  env: ApiEnv;
}

/** Where users land after a settings-initiated link (also the default `returnTo` for that flow). */
const SETTINGS_PATH = "/settings/profile";

function parseProvider(value: string): OAuthProvider {
  const parsed = OAuthProviderSchema.safeParse(value);
  if (!parsed.success) throw new AuthError(404, "NOT_FOUND", "Unknown OAuth provider.");
  return parsed.data;
}

/**
 * Registers the OAuth endpoints (docs/api/rest-api.md):
 * - `GET /auth/oauth/:provider/start` and `/callback` — public, rate limited, redirect-based.
 * - `GET /me/oauth-accounts`, `POST /me/oauth-accounts/:provider/link`, `DELETE /me/oauth-accounts/:id`.
 */
export function oauthRoutes({ authService, oauthService, env }: OAuthRoutesOptions): FastifyPluginAsyncZod {
  const isProduction = env.NODE_ENV === "production";
  const webBase = env.WEB_ORIGIN.replace(/\/+$/, "");
  const codec = createStateCodec(env.JWT_ACCESS_SECRET);
  const clients: Record<OAuthProvider, OAuthProviderClient | null> = {
    google: createProviderClient(env, "google"),
    github: createProviderClient(env, "github"),
  };

  function redirectToError(reply: FastifyReply, code: OAuthErrorCode, provider?: OAuthProvider): FastifyReply {
    const params = new URLSearchParams({ code });
    if (provider) params.set("provider", provider);
    return reply.redirect(`${webBase}/oauth/error?${params.toString()}`);
  }

  /** Begins an authorization flow: seals state + PKCE verifier into the cookie and builds the provider URL. */
  function beginFlow(
    reply: FastifyReply,
    client: OAuthProviderClient,
    flow: { provider: OAuthProvider; returnTo: string; linkUserId?: string },
  ): string {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const sealed = codec.seal({
      s: state,
      v: codeVerifier,
      p: flow.provider,
      r: flow.returnTo,
      ...(flow.linkUserId ? { l: flow.linkUserId } : {}),
    });
    setStateCookie(reply, sealed, isProduction);
    return client.createAuthorizationUrl(state, codeVerifier).toString();
  }

  /** True when the request's access cookie is a live session of exactly this user. */
  async function sessionBelongsTo(request: FastifyRequest, userId: string): Promise<boolean> {
    try {
      const decoded = await request.jwtVerify<{ sub: string; sid: string }>({ onlyCookie: true });
      return decoded.sub === userId && (await oauthService.isActiveSessionFor(decoded.sid, userId));
    } catch {
      return false;
    }
  }

  const publicRoutes: FastifyPluginAsyncZod = async (app) => {
    registerAuthErrorHandler(app);

    await app.register(rateLimit, {
      max: env.OAUTH_RATE_LIMIT_PER_MINUTE,
      timeWindow: "1 minute",
      keyGenerator: (request) => request.ip,
      errorResponseBuilder: (_request, context) =>
        Object.assign(new Error(`Too many requests. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`), {
          statusCode: 429,
        }),
    });

    // SC-AUTH-013, SC-AUTH-021, SC-AUTH-022
    app.get(
      "/:provider/start",
      { schema: { params: OAuthProviderParamsSchema, querystring: OAuthStartQuerySchema } },
      async (request, reply) => {
        const provider = parseProvider(request.params.provider);
        const client = clients[provider];
        if (!client) return redirectToError(reply, "PROVIDER_NOT_CONFIGURED", provider);

        const url = beginFlow(reply, client, { provider, returnTo: sanitizeReturnTo(request.query.returnTo) });
        return reply.redirect(url);
      },
    );

    // SC-AUTH-013..016, SC-AUTH-021..023
    app.get(
      "/:provider/callback",
      { schema: { params: OAuthProviderParamsSchema, querystring: OAuthCallbackQuerySchema } },
      async (request, reply) => {
        const provider = parseProvider(request.params.provider);
        const fail = (code: OAuthErrorCode) => redirectToError(reply, code, provider);

        // The state cookie is single-use: drop it whatever happens next so a callback cannot be replayed.
        const flow = codec.open(request.cookies[OAUTH_STATE_COOKIE_NAME]);
        clearStateCookie(reply);

        const { code, state, error } = request.query;
        if (!flow || flow.p !== provider || !state || !safeEqual(state, flow.s)) return fail("INVALID_STATE");
        if (error) return fail(error === "access_denied" ? "ACCESS_DENIED" : "PROVIDER_ERROR");
        if (!code) return fail("INVALID_STATE");

        const client = clients[provider];
        if (!client) return fail("PROVIDER_NOT_CONFIGURED");

        try {
          // A link flow is bound to the user who started it: refuse if the browser's session changed.
          if (flow.l && !(await sessionBelongsTo(request, flow.l))) return fail("INVALID_STATE");

          const profile = await client.exchangeAndFetchProfile(code, flow.v);

          if (flow.l) {
            await oauthService.linkToUser(flow.l, provider, profile);
            const params = new URLSearchParams({ linked: provider });
            return reply.redirect(`${webBase}${SETTINGS_PATH}?${params.toString()}`);
          }

          const user = await oauthService.resolveSignIn(provider, profile);
          const { accessToken, refreshToken } = await authService.issueSession(user, request.headers["user-agent"]);
          setAuthCookies({ reply, accessToken, refreshToken, isProduction });
          // Cookies only: the redirect target carries no token (ADR-005 §3).
          return reply.redirect(`${webBase}${sanitizeReturnTo(flow.r)}`);
        } catch (caught) {
          if (caught instanceof OAuthFlowError) return fail(caught.code);
          if (caught instanceof ProviderError) {
            request.log.warn({ provider, reason: caught.message }, "OAuth provider exchange failed");
            return fail("PROVIDER_ERROR");
          }
          request.log.error({ err: caught, provider }, "Unexpected OAuth callback failure");
          return fail("PROVIDER_ERROR");
        }
      },
    );
  };

  const accountRoutes: FastifyPluginAsyncZod = async (app) => {
    registerAuthErrorHandler(app);
    const middleware = createAuthMiddleware(authService.db, env);

    // SC-AUTH-024
    app.get(
      "/",
      {
        preHandler: [middleware.authenticateUser],
        schema: { response: { 200: apiSuccess(ListOAuthAccountsResponseSchema) } },
      },
      async (request, reply) => {
        const user = request.authUser;
        if (!user) throw new AuthError(401, "UNAUTHENTICATED", "Authentication required.");
        return reply.code(200).send({ success: true, data: await oauthService.listAccounts(user) });
      },
    );

    // SC-AUTH-019, SC-AUTH-023: starting a link requires a verified email (ADR-005 §7)
    app.post(
      "/:provider/link",
      {
        preHandler: [middleware.validateCsrf, middleware.authenticateUser, middleware.requireVerifiedEmail],
        schema: {
          params: OAuthProviderParamsSchema,
          response: { 200: apiSuccess(StartOAuthLinkResponseSchema) },
        },
      },
      async (request, reply) => {
        const user = request.authUser;
        if (!user) throw new AuthError(401, "UNAUTHENTICATED", "Authentication required.");
        const provider = parseProvider(request.params.provider);
        const client = clients[provider];
        if (!client) {
          throw new AuthError(503, "SERVICE_UNAVAILABLE", "This sign-in provider is not available.");
        }
        const authorizationUrl = beginFlow(reply, client, { provider, returnTo: SETTINGS_PATH, linkUserId: user.id });
        return reply.code(200).send({ success: true, data: { authorizationUrl } });
      },
    );

    // SC-AUTH-024
    app.delete(
      "/:id",
      {
        preHandler: [middleware.validateCsrf, middleware.authenticateUser],
        schema: {
          params: OAuthAccountParamsSchema,
          response: { 200: apiSuccess(UnlinkOAuthAccountResponseSchema) },
        },
      },
      async (request, reply) => {
        const user = request.authUser;
        if (!user) throw new AuthError(401, "UNAUTHENTICATED", "Authentication required.");
        await oauthService.unlink(user, request.params.id);
        return reply.code(200).send({ success: true, data: { unlinked: true } });
      },
    );
  };

  return async (app) => {
    await app.register(publicRoutes, { prefix: "/api/v1/auth/oauth" });
    await app.register(accountRoutes, { prefix: "/api/v1/me/oauth-accounts" });
  };
}
