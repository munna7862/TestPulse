import { createTenantDb, type PrismaClient } from "@testpulse/db";
import { hasOrgRole, OrgParamsSchema, type OrgRole } from "@testpulse/shared";
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
}

declare module "fastify" {
  interface FastifyRequest {
    tenantContext?: TenantRequestContext;
  }
}

type TenantHook = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
export type TenantHookFactory = (policy: OrgRoutePolicy) => TenantHook;

function isTenantRoute(url: string): boolean {
  return url === ORG_ROUTE_PREFIX || url.startsWith(`${ORG_ROUTE_PREFIX}/`);
}

/**
 * Classifies every route as it is registered. Tenant routes without a policy entry throw (fail closed); tenant
 * routes with one get the tenant-context hook as their first preValidation step, so it runs before body
 * validation and a non-member never learns anything from a 400.
 */
export function registerTenantRouteGuard(app: FastifyInstance, createHook?: TenantHookFactory): void {
  app.addHook("onRoute", (route: RouteOptions) => {
    if (!isTenantRoute(route.url)) return;
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    const policies = methods.map((method) => {
      // Fastify adds a HEAD twin for every GET route; it inherits the GET policy.
      const effective = method === "HEAD" ? "GET" : method;
      const policy = ORG_ROUTE_POLICY.find((entry) => entry.method === effective && entry.url === route.url);
      if (!policy) {
        throw new Error(`${method} ${route.url} has no entry in the tenant isolation table (ORG_ROUTE_POLICY).`);
      }
      return policy;
    });
    const [policy] = policies;
    if (!createHook || !policy) return;
    const existing = route.preValidation;
    const rest = existing === undefined ? [] : Array.isArray(existing) ? existing : [existing];
    route.preValidation = [createHook(policy), ...rest];
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

    const params = OrgParamsSchema.safeParse(request.params);
    const orgId = params.success ? params.data.orgId : "";
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

    request.tenantContext = { orgId, userId: user.id, role: membership.role };
    return undefined;
  };
}

/** The resolved tenant context; a tenant route reaching its handler without one is a wiring bug (fail closed). */
export function tenantContextOf(request: FastifyRequest): TenantRequestContext {
  if (!request.tenantContext) throw new Error("Tenant context missing: route is not guarded by the tenant hook.");
  return request.tenantContext;
}
