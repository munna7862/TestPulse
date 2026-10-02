/**
 * Pure tenant-scoping rules for the tenant client (ADR-006 layer 3, docs/database/schema.md §2).
 * Kept free of Prisma imports so the rules are exhaustively unit-testable.
 */

export interface TenantContext {
  orgId: string;
  projectId?: string;
}

/**
 * Isolation class of every model in master plan §5. Models are listed before they exist so that adding
 * one to the schema without classifying it here fails closed (see `scopeFor`).
 */
export const MODEL_SCOPE = {
  // Global identity tables: never through the tenant client.
  User: "global",
  OAuthAccount: "global",
  Session: "global",
  VerificationToken: "global",
  // The tenant itself: reads are pinned to ctx.orgId; creation happens via systemDb (P03-S03).
  Organization: "org-self",
  // Org-scoped.
  OrgMember: "org",
  Invitation: "org",
  Project: "org",
  AuditEvent: "org",
  Notification: "org",
  // Project-scoped.
  ApiKey: "project",
  TestSuite: "project",
  TestCase: "project",
  TestRun: "project",
  TestResult: "project",
  QuarantineRecord: "project",
  QuarantineTransition: "project",
  Annotation: "project",
  Webhook: "project",
  WebhookDelivery: "project",
  NotificationPreference: "project",
  ProjectDailyMetric: "project",
  TestCaseDailyMetric: "project",
} as const satisfies Record<string, "global" | "org-self" | "org" | "project">;

export type ModelScope = (typeof MODEL_SCOPE)[keyof typeof MODEL_SCOPE];

export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantScopeError";
  }
}

const FILTERED_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "updateManyAndReturn",
  "deleteMany",
]);
const CREATE_OPERATIONS = new Set(["create", "createMany", "createManyAndReturn"]);
/** Operations addressing a row by unique key alone — the tenant cannot be enforced, so they are banned. */
const FORBIDDEN_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"]);

export function scopeFor(model: string): ModelScope {
  const scope = (MODEL_SCOPE as Record<string, ModelScope | undefined>)[model];
  if (!scope) {
    throw new TenantScopeError(`Model "${model}" has no isolation class in MODEL_SCOPE; classify it before use.`);
  }
  return scope;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns new operation arguments with the tenant constraint applied, or throws `TenantScopeError`.
 * Filters are combined with AND so a caller-supplied filter can never widen the scope.
 */
export function scopeTenantArgs(model: string, operation: string, args: unknown, ctx: TenantContext): unknown {
  const scope = scopeFor(model);
  if (scope === "global") {
    throw new TenantScopeError(`${model} is a global table; use the system client in the owning module.`);
  }
  if (FORBIDDEN_OPERATIONS.has(operation)) {
    throw new TenantScopeError(
      `${model}.${operation} is not allowed on the tenant client; use findFirst/updateMany/deleteMany with the id plus tenant filter.`,
    );
  }

  const field = scope === "project" ? "projectId" : scope === "org" ? "orgId" : "id";
  const value = scope === "project" ? ctx.projectId : ctx.orgId;
  if (!value) {
    throw new TenantScopeError(`Tenant context is missing ${scope === "project" ? "projectId" : "orgId"} for ${model}.${operation}.`);
  }

  const base = isRecord(args) ? args : {};

  if (FILTERED_OPERATIONS.has(operation)) {
    const where = base.where;
    const constraint = { [field]: value };
    return { ...base, where: isRecord(where) ? { AND: [where, constraint] } : constraint };
  }

  if (CREATE_OPERATIONS.has(operation)) {
    if (scope === "org-self") {
      throw new TenantScopeError(`${model} cannot be created through the tenant client.`);
    }
    const stamp = (row: unknown): Record<string, unknown> => {
      if (!isRecord(row)) throw new TenantScopeError(`Invalid data for ${model}.${operation}.`);
      if (row[field] !== undefined && row[field] !== value) {
        throw new TenantScopeError(`Cross-tenant write blocked on ${model}.${operation}.`);
      }
      return { ...row, [field]: value };
    };
    const data = base.data;
    return { ...base, data: Array.isArray(data) ? data.map(stamp) : stamp(data) };
  }

  throw new TenantScopeError(`${model}.${operation} is not supported by the tenant client.`);
}
