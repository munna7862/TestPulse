import { createTenantDb, type PrismaClient } from "@testpulse/db";
import {
  hasOrgRole,
  OrgIdSchema,
  OrgParamsSchema,
  type OrgRole,
  ProjectIdSchema,
  ProjectParamsSchema,
} from "@testpulse/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import type { ApiEnv } from "../env";
import { createAuthMiddleware } from "../modules/auth/auth.middleware";

/** Every route under this prefix is org-scoped and must appear in ORG_ROUTE_POLICY. */
export const ORG_ROUTE_PREFIX = "/api/v1/orgs/:orgId";
/** Every route under this prefix is project-scoped and must appear in PROJECT_ROUTE_POLICY. */
export const PROJECT_ROUTE_PREFIX = "/api/v1/projects/:projectId";

export interface OrgRoutePolicy {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  minRole: OrgRole;
}

/**
 * Isolation tables (master plan §7.2, docs/security/rbac-matrix.md). The tenant-context preValidation hook reads
 * the minimum role from here, and registering a tenant route without an entry fails at startup.
 */
export const ORG_ROUTE_POLICY: readonly OrgRoutePolicy[] = [
  { method: "GET", url: "/api/v1/orgs/:orgId", minRole: "VIEWER" },
  { method: "PATCH", url: "/api/v1/orgs/:orgId", minRole: "ADMIN" },
  { method: "DELETE", url: "/api/v1/orgs/:orgId", minRole: "OWNER" },
  { method: "GET", url: "/api/v1/orgs/:orgId/members", minRole: "VIEWER" },
  { method: "POST", url: "/api/v1/orgs/:orgId/transfer-ownership", minRole: "OWNER" },
  { method: "GET", url: "/api/v1/orgs/:orgId/projects", minRole: "VIEWER" },
  { method: "POST", url: "/api/v1/orgs/:orgId/projects", minRole: "ADMIN" },
];

export const PROJECT_ROUTE_POLICY: readonly OrgRoutePolicy[] = [
  { method: "GET", url: "/api/v1/projects/:projectId", minRole: "VIEWER" },
  { method: "PATCH", url: "/api/v1/projects/:projectId", minRole: "ADMIN" },
  { method: "DELETE", url: "/api/v1/projects/:projectId", minRole: "ADMIN" },
];

interface TenantScope {
  kind: "org" | "project";
  /** Any parameterised path under this root belongs to the scope, whatever the parameter is called. */
  root: string;
  prefix: string;
  param: string;
  table: readonly OrgRoutePolicy[];
  tableName: string;
  notFound: string;
}

const SCOPES: readonly TenantScope[] = [
  {
    kind: "org",
    root: "/api/v1/orgs/:",
    prefix: ORG_ROUTE_PREFIX,
    param: ":orgId",
    table: ORG_ROUTE_POLICY,
    tableName: "ORG_ROUTE_POLICY",
    notFound: "Organization not found.",
  },
  {
    kind: "project",
    root: "/api/v1/projects/:",
    prefix: PROJECT_ROUTE_PREFIX,
    param: ":projectId",
    table: PROJECT_ROUTE_POLICY,
    tableName: "PROJECT_ROUTE_POLICY",
    notFound: "Project not found.",
  },
];

export interface TenantRequestContext {
  orgId: string;
  /** Set on project routes. */
  projectId?: string;
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

/** Fastify adds a HEAD twin for every GET route; it inherits the GET policy. */
function effectiveMethod(method: string): string {
  return method === "HEAD" ? "GET" : method;
}

/**
 * Classifies every route as it is registered, failing closed: a tenant route must name its parameter exactly
 * (`:orgId` or `:projectId`, no other name, no regex) and every one of its methods needs a policy entry, or
 * startup throws. Each tenant route gets the tenant-context hook as its first preValidation step, so it runs
 * before body validation and an outsider never learns anything from a 400. The hook picks the policy of the
 * request's own method, so a route serving several methods enforces each method's minimum role.
 */
export function registerTenantRouteGuard(app: FastifyInstance, createHook?: TenantHookFactory): void {
  app.addHook("onRoute", (route: RouteOptions) => {
    const scope = SCOPES.find((candidate) => route.url.startsWith(candidate.root));
    if (!scope) return;
    if (route.url !== scope.prefix && !route.url.startsWith(`${scope.prefix}/`)) {
      throw new Error(
        `${route.url}: ${scope.kind} routes must name the parameter exactly ${scope.param} (no other name, no regex) so the tenant guard applies.`,
      );
    }
    // The org hook only resolves the org, so a project id under it would never be checked against that org.
    if (scope.kind === "org" && /:projectId(?![A-Za-z0-9_])/.test(route.url)) {
      throw new Error(
        `${route.url}: org routes must not carry :projectId; use ${PROJECT_ROUTE_PREFIX}/... so the project is resolved against the caller's org.`,
      );
    }
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    const hooks = new Map<string, TenantHook>();
    for (const method of methods) {
      const effective = effectiveMethod(method);
      const policy = scope.table.find((entry) => entry.method === effective && entry.url === route.url);
      if (!policy) {
        throw new Error(`${method} ${route.url} has no entry in the tenant isolation table (${scope.tableName}).`);
      }
      if (createHook) hooks.set(effective, createHook(policy));
    }
    if (!createHook) return;

    const guard: TenantHook = async (request, reply) => {
      const hook = hooks.get(effectiveMethod(request.method));
      if (!hook) throw request.server.httpErrors.notFound(scope.notFound);
      return hook(request, reply);
    };
    const existing = route.preValidation;
    const rest = existing === undefined ? [] : Array.isArray(existing) ? existing : [existing];
    route.preValidation = [guard, ...rest];
  });
}

interface ResolvedMembership {
  orgId: string;
  projectId?: string;
  role: OrgRole;
}

/** `org → membership`. Malformed ids (including NUL bytes Postgres rejects) get the 404 without a query. */
async function resolveOrg(db: PrismaClient, params: unknown, userId: string): Promise<ResolvedMembership | null> {
  const parsed = OrgParamsSchema.safeParse(params);
  const id = parsed.success ? OrgIdSchema.safeParse(parsed.data.orgId) : null;
  if (!id?.success) return null;
  const membership = await createTenantDb(db, { orgId: id.data }).orgMember.findFirst({
    where: { userId, org: { deletedAt: null } },
    select: { role: true },
  });
  return membership ? { orgId: id.data, role: membership.role } : null;
}

/**
 * `project → org → membership` in one query. The org is unknown until the project is found, so this read uses the
 * system client (ADR-006 amendment 1: membership lookups keyed by the authenticated user); it returns only the
 * caller's own membership row.
 */
async function resolveProject(db: PrismaClient, params: unknown, userId: string): Promise<ResolvedMembership | null> {
  const parsed = ProjectParamsSchema.safeParse(params);
  const id = parsed.success ? ProjectIdSchema.safeParse(parsed.data.projectId) : null;
  if (!id?.success) return null;
  const membership = await db.orgMember.findFirst({
    where: { userId, org: { deletedAt: null, projects: { some: { id: id.data, deletedAt: null } } } },
    select: { role: true, orgId: true },
  });
  return membership ? { orgId: membership.orgId, projectId: id.data, role: membership.role } : null;
}

/**
 * Resolves the tenant and the caller's role into `request.tenantContext` (master plan §7.2). Outsiders, missing,
 * malformed and soft-deleted tenants all get the same 404; members below the route's minimum role get 403.
 */
export function createTenantContextHook(db: PrismaClient, env: ApiEnv): TenantHookFactory {
  const auth = createAuthMiddleware(db, env);
  return (policy) => {
    const project = policy.url.startsWith(PROJECT_ROUTE_PREFIX);
    const notFound = project ? "Project not found." : "Organization not found.";
    return async (request, reply) => {
      await auth.authenticateUser(request, reply);
      if (reply.sent) return reply;
      await auth.validateCsrf(request, reply);
      if (reply.sent) return reply;

      const user = request.authUser;
      if (!user) throw request.server.httpErrors.unauthorized("Authentication required.");

      const membership = project
        ? await resolveProject(db, request.params, user.id)
        : await resolveOrg(db, request.params, user.id);
      if (!membership) throw request.server.httpErrors.notFound(notFound);
      if (!hasOrgRole(membership.role, policy.minRole)) {
        throw request.server.httpErrors.forbidden("Your role does not allow this action.");
      }

      request.tenantContext = { ...membership, userId: user.id, minRole: policy.minRole };
      return undefined;
    };
  };
}

/** The resolved tenant context; a tenant route reaching its handler without one is a wiring bug (fail closed). */
export function tenantContextOf(request: FastifyRequest): TenantRequestContext {
  if (!request.tenantContext) throw new Error("Tenant context missing: route is not guarded by the tenant hook.");
  return request.tenantContext;
}

/** The project id of a project route's tenant context (fail closed when called on an org route). */
export function projectIdOf(ctx: TenantRequestContext): string {
  if (!ctx.projectId) throw new Error("Tenant context has no projectId: not a project route.");
  return ctx.projectId;
}
