import { createTenantDb, type PrismaClient } from "@testpulse/db";
import { hasOrgRole, OrgIdSchema, OrgParamsSchema, type OrgRole } from "@testpulse/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import type { ApiEnv } from "../env";
import { createAuthMiddleware } from "../modules/auth/auth.middleware";

/** Every route under this prefix is tenant-scoped and must appear in ORG_ROUTE_POLICY. */
export const ORG_ROUTE_PREFIX = "/api/v1/orgs/:orgId";

export interface OrgRoutePolicy {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  minRole: OrgRole;
}

/**
 * Isolation table (master plan §7.2, docs/security/rbac-matrix.md). The tenant-context preValidation hook reads
 * the minimum role from here, and registering a route under ORG_ROUTE_PREFIX without an entry fails at startup.
 */
export const ORG_ROUTE_POLICY: readonly OrgRoutePolicy[] = [
  { method: "GET", url: "/api/v1/orgs/:orgId", minRole: "VIEWER" },
  { method: "PATCH", url: "/api/v1/orgs/:orgId", minRole: "ADMIN" },
  { method: "DELETE", url: "/api/v1/orgs/:orgId", minRole: "OWNER" },
  { method: "GET", url: "/api/v1/orgs/:orgId/members", minRole: "VIEWER" },
  { method: "POST", url: "/api/v1/orgs/:orgId/transfer-ownership", minRole: "OWNER" },
];

export interface TenantRequestContext {
  orgId: string;
  userId: string;
  role: OrgRole;
  /** The route's minimum role; writes re-check it so a role lost mid-request is not used (S-001 review F3). */
  minRole: OrgRole;
}

declare module "fastify" {
  interface FastifyRequest {
    tenantContext?: TenantRequestContext;
  }
}

type TenantHook = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
export type TenantHookFactory = (policy: OrgRoutePolicy) => TenantHook;

/** Any parameterised path under /api/v1/orgs/ is an org route, whatever the parameter is called. */
const ORG_ROUTE_ROOT = "/api/v1/orgs/:";

/** Fastify adds a HEAD twin for every GET route; it inherits the GET policy. */
function effectiveMethod(method: string): string {
  return method === "HEAD" ? "GET" : method;
}

/**
 * Classifies every route as it is registered, failing closed: an org route must name its parameter exactly
 * `:orgId` (no other name, no regex) and every one of its methods needs a policy entry, or startup throws. Each
 * org route gets the tenant-context hook as its first preValidation step, so it runs before body validation and
 * a non-member never learns anything from a 400. The hook picks the policy of the request's own method, so a
 * route serving several methods enforces each method's minimum role.
 */
export function registerTenantRouteGuard(app: FastifyInstance, createHook?: TenantHookFactory): void {
  app.addHook("onRoute", (route: RouteOptions) => {
    if (!route.url.startsWith(ORG_ROUTE_ROOT)) return;
    if (route.url !== ORG_ROUTE_PREFIX && !route.url.startsWith(`${ORG_ROUTE_PREFIX}/`)) {
      throw new Error(
        `${route.url}: org routes must name the org parameter exactly :orgId (no other name, no regex) so the tenant guard applies.`,
      );
    }
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    const hooks = new Map<string, TenantHook>();
    for (const method of methods) {
      const effective = effectiveMethod(method);
      const policy = ORG_ROUTE_POLICY.find((entry) => entry.method === effective && entry.url === route.url);
      if (!policy) {
        throw new Error(`${method} ${route.url} has no entry in the tenant isolation table (ORG_ROUTE_POLICY).`);
      }
      if (createHook) hooks.set(effective, createHook(policy));
    }
    if (!createHook) return;

    const guard: TenantHook = async (request, reply) => {
      const hook = hooks.get(effectiveMethod(request.method));
      if (!hook) throw request.server.httpErrors.notFound("Organization not found.");
      return hook(request, reply);
    };
    const existing = route.preValidation;
    const rest = existing === undefined ? [] : Array.isArray(existing) ? existing : [existing];
    route.preValidation = [guard, ...rest];
  });
}

/**
 * Resolves `org → membership → role` into `request.tenantContext` (master plan §7.2). Non-members, missing and
 * soft-deleted orgs all get the same 404; members below the route's minimum role get 403.
 */
export function createTenantContextHook(db: PrismaClient, env: ApiEnv): TenantHookFactory {
  const auth = createAuthMiddleware(db, env);
  return (policy) => async (request, reply) => {
    await auth.authenticateUser(request, reply);
    if (reply.sent) return reply;
    await auth.validateCsrf(request, reply);
    if (reply.sent) return reply;

    const user = request.authUser;
    if (!user) throw request.server.httpErrors.unauthorized("Authentication required.");

    // Malformed ids (including NUL bytes Postgres rejects) get the same 404 without a query.
    const params = OrgParamsSchema.safeParse(request.params);
    const id = params.success ? OrgIdSchema.safeParse(params.data.orgId) : null;
    const orgId = id?.success ? id.data : "";
    const membership = orgId
      ? await createTenantDb(db, { orgId }).orgMember.findFirst({
          where: { userId: user.id, org: { deletedAt: null } },
          select: { role: true },
        })
      : null;
    if (!membership) throw request.server.httpErrors.notFound("Organization not found.");
    if (!hasOrgRole(membership.role, policy.minRole)) {
      throw request.server.httpErrors.forbidden("Your role does not allow this action.");
    }

    request.tenantContext = { orgId, userId: user.id, role: membership.role, minRole: policy.minRole };
    return undefined;
  };
}

/** The resolved tenant context; a tenant route reaching its handler without one is a wiring bug (fail closed). */
export function tenantContextOf(request: FastifyRequest): TenantRequestContext {
  if (!request.tenantContext) throw new Error("Tenant context missing: route is not guarded by the tenant hook.");
  return request.tenantContext;
}
