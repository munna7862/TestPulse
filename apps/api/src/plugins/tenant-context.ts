import { createTenantDb, type PrismaClient } from "@testpulse/db";
import {
  can,
  minRoleFor,
  OrgIdSchema,
  OrgParamsSchema,
  type OrgRole,
  type PermissionAction,
  ProjectIdSchema,
  ProjectParamsSchema,
} from "@testpulse/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import type { ApiEnv } from "../env";
import { createAuthMiddleware } from "../modules/auth/auth.middleware";
import type { RateLimitStore } from "../modules/auth/rate-limiter";

/** Every route under this prefix is org-scoped and must appear in ORG_ROUTE_POLICY. */
export const ORG_ROUTE_PREFIX = "/api/v1/orgs/:orgId";
/** Every route under this prefix is project-scoped and must appear in PROJECT_ROUTE_POLICY. */
export const PROJECT_ROUTE_PREFIX = "/api/v1/projects/:projectId";

export interface OrgRoutePolicy {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  action: PermissionAction;
  /** Minimum role derived from `@testpulse/shared` `PERMISSIONS[action]` via `minRoleFor(action)`. */
  minRole: OrgRole;
  /** Param holding a userId when targeting oneself uses `member.leave` instead of `action`. */
  allowSelfParam?: string;
}

function policyEntry(
  method: OrgRoutePolicy["method"],
  url: string,
  action: PermissionAction,
  allowSelfParam?: string,
): OrgRoutePolicy {
  return {
    method,
    url,
    action,
    minRole: minRoleFor(action),
    ...(allowSelfParam ? { allowSelfParam } : {}),
  };
}

/**
 * Isolation tables (master plan §7.2, docs/security/rbac-matrix.md). The tenant-context preValidation hook reads
 * permissions from `@testpulse/shared`, and registering a tenant route without an entry fails at startup.
 */
export const ORG_ROUTE_POLICY: readonly OrgRoutePolicy[] = [
  policyEntry("GET", "/api/v1/orgs/:orgId", "org.read"),
  policyEntry("PATCH", "/api/v1/orgs/:orgId", "org.update"),
  policyEntry("DELETE", "/api/v1/orgs/:orgId", "org.delete"),
  policyEntry("GET", "/api/v1/orgs/:orgId/members", "org.read"),
  policyEntry("PATCH", "/api/v1/orgs/:orgId/members/:userId", "member.changeRole"),
  policyEntry("DELETE", "/api/v1/orgs/:orgId/members/:userId", "member.remove", "userId"),
  policyEntry("GET", "/api/v1/orgs/:orgId/invitations", "member.invite"),
  policyEntry("POST", "/api/v1/orgs/:orgId/invitations", "member.invite"),
  policyEntry("POST", "/api/v1/orgs/:orgId/invitations/:id/resend", "member.invite"),
  policyEntry("DELETE", "/api/v1/orgs/:orgId/invitations/:id", "member.invite"),
  policyEntry("POST", "/api/v1/orgs/:orgId/transfer-ownership", "org.transferOwnership"),
  policyEntry("GET", "/api/v1/orgs/:orgId/projects", "project.read"),
  policyEntry("POST", "/api/v1/orgs/:orgId/projects", "project.create"),
];

export const PROJECT_ROUTE_POLICY: readonly OrgRoutePolicy[] = [
  policyEntry("GET", "/api/v1/projects/:projectId", "project.read"),
  policyEntry("PATCH", "/api/v1/projects/:projectId", "project.update"),
  policyEntry("DELETE", "/api/v1/projects/:projectId", "project.delete"),
  policyEntry("GET", "/api/v1/projects/:projectId/api-keys", "apiKey.manage"),
  policyEntry("POST", "/api/v1/projects/:projectId/api-keys", "apiKey.manage"),
  policyEntry("DELETE", "/api/v1/projects/:projectId/api-keys/:keyId", "apiKey.manage"),
];

export interface NonTenantRouteEntry {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
  url: string;
  category: "public" | "auth-user";
  optional?: boolean;
}

/** Explicit registry of all public and authenticated user-level routes outside `/orgs/:orgId` and `/projects/:projectId`. */
export const NON_TENANT_ROUTES: readonly NonTenantRouteEntry[] = [
  { method: "OPTIONS", url: "*", category: "public" },
  { method: "GET", url: "/health", category: "public" },
  { method: "POST", url: "/api/v1/auth/register", category: "public" },
  { method: "POST", url: "/api/v1/auth/verify-email", category: "public" },
  { method: "POST", url: "/api/v1/auth/resend-verification", category: "public" },
  { method: "POST", url: "/api/v1/auth/login", category: "public" },
  { method: "POST", url: "/api/v1/auth/refresh", category: "auth-user" },
  { method: "POST", url: "/api/v1/auth/logout", category: "auth-user" },
  { method: "POST", url: "/api/v1/auth/logout-all", category: "auth-user" },
  { method: "POST", url: "/api/v1/auth/password/forgot", category: "public" },
  { method: "POST", url: "/api/v1/auth/password/reset", category: "public" },
  { method: "GET", url: "/api/v1/auth/me", category: "auth-user" },
  { method: "POST", url: "/api/v1/auth/restricted-action", category: "auth-user", optional: true },
  { method: "GET", url: "/api/v1/auth/oauth/:provider/start", category: "public" },
  { method: "GET", url: "/api/v1/auth/oauth/:provider/callback", category: "public" },
  { method: "GET", url: "/api/v1/me/oauth-accounts", category: "auth-user" },
  { method: "POST", url: "/api/v1/me/oauth-accounts/:provider/link", category: "auth-user" },
  { method: "DELETE", url: "/api/v1/me/oauth-accounts/:id", category: "auth-user" },
  { method: "POST", url: "/api/v1/orgs", category: "auth-user" },
  { method: "GET", url: "/api/v1/orgs", category: "auth-user" },
  { method: "POST", url: "/api/v1/invitations/accept", category: "auth-user" },
];

/** Verifies every registered HTTP route belongs to ORG_ROUTE_POLICY, PROJECT_ROUTE_POLICY, or NON_TENANT_ROUTES with zero gaps or stale entries. */
export function assertAllRoutesClassified(registered: readonly { method: string; url: string }[]): void {
  const classified = new Set<string>();
  const required = new Set<string>();

  for (const entry of ORG_ROUTE_POLICY) {
    const key = `${entry.method} ${entry.url}`;
    classified.add(key);
    required.add(key);
  }
  for (const entry of PROJECT_ROUTE_POLICY) {
    const key = `${entry.method} ${entry.url}`;
    classified.add(key);
    required.add(key);
  }
  for (const entry of NON_TENANT_ROUTES) {
    const key = `${entry.method} ${entry.url}`;
    classified.add(key);
    if (!entry.optional) required.add(key);
  }

  const getUrls = new Set(registered.filter((route) => route.method === "GET").map((route) => route.url));
  const actual = new Set<string>();
  const duplicates: string[] = [];
  const unclassified: string[] = [];

  for (const route of registered) {
    const key = `${route.method} ${route.url}`;
    if (actual.has(key)) duplicates.push(key);
    actual.add(key);

    if (route.method === "HEAD") {
      // Fastify auto-adds a HEAD twin for every GET route; standalone HEAD routes must be classified explicitly.
      const twinGet = `GET ${route.url}`;
      if (!classified.has(key) && !(getUrls.has(route.url) && classified.has(twinGet))) {
        unclassified.push(key);
      }
      continue;
    }

    if (!classified.has(key)) unclassified.push(key);
  }

  if (duplicates.length > 0) {
    throw new Error(`Duplicate route registration(s) detected: ${duplicates.join(", ")}`);
  }
  if (unclassified.length > 0) {
    throw new Error(`Unclassified route(s) missing from isolation/non-tenant registries: ${unclassified.join(", ")}`);
  }

  const stale = [...required].filter((key) => !actual.has(key));
  if (stale.length > 0) {
    throw new Error(`Stale classified route(s) not registered on app: ${stale.join(", ")}`);
  }
}

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
export function createTenantContextHook(
  db: PrismaClient,
  env: ApiEnv,
  rateLimitStore?: RateLimitStore,
): TenantHookFactory {
  const auth = createAuthMiddleware(db, env, rateLimitStore);
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

      const targetParam = policy.allowSelfParam
        ? (request.params as Record<string, unknown> | undefined)?.[policy.allowSelfParam]
        : undefined;
      const isSelf = typeof targetParam === "string" && targetParam === user.id;
      const requiredAction = isSelf ? "member.leave" : policy.action;
      if (!can(membership.role, requiredAction)) {
        const message = isSelf
          ? "Transfer ownership before leaving the organization."
          : "Your role does not allow this action.";
        throw request.server.httpErrors.forbidden(message);
      }

      request.tenantContext = { ...membership, userId: user.id, minRole: minRoleFor(requiredAction) };
      const tenantLog = request.log.child({
        orgId: membership.orgId,
        ...(membership.projectId ? { projectId: membership.projectId } : {}),
      });
      request.log = tenantLog;
      reply.log = tenantLog;
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
