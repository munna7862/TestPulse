import crypto from "node:crypto";
import { createTenantDb, type PrismaClient } from "@testpulse/db";
import {
  API_KEY_LIVE_PREFIX,
  type ApiKey,
  ApiKeyIdSchema,
  type ApiKeyStatus,
  type CreateApiKeyBody,
  type CreatedApiKey,
  rolesAtLeast,
} from "@testpulse/shared";
import { ApiError } from "../../lib/api-error";
import { projectIdOf, type TenantRequestContext } from "../../plugins/tenant-context";

const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE62_KEY_LENGTH = 43; // ceil(256 / log2(62)) = 43 chars encodes full 32-byte entropy cleanly.
const PREFIX_LENGTH = 8;
const NOT_FOUND = "API key not found.";
const PROJECT_NOT_FOUND = "Project not found.";
const FORBIDDEN = "Your role does not allow this action.";

/** Generates `tp_live_` + 43 base62 characters encoding 32 cryptographically random bytes. */
export function generateApiKeySecret(): { plaintextKey: string; prefix: string; keyHash: string } {
  let value = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
  const chars: string[] = Array.from({ length: BASE62_KEY_LENGTH }, () => "0");
  for (let i = BASE62_KEY_LENGTH - 1; i >= 0; i -= 1) {
    chars[i] = BASE62_ALPHABET[Number(value % 62n)] ?? "0";
    value /= 62n;
  }
  const secret = chars.join("");
  const plaintextKey = `${API_KEY_LIVE_PREFIX}${secret}`;
  return {
    plaintextKey,
    prefix: secret.slice(0, PREFIX_LENGTH),
    keyHash: hashApiKey(plaintextKey),
  };
}

/** Deterministic SHA-256 hex digest of an API key (safe for high-entropy secrets). */
export function hashApiKey(plaintextKey: string): string {
  return crypto.createHash("sha256").update(plaintextKey).digest("hex");
}

interface ApiKeyRow {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  prefix: string;
  createdById: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  createdBy: { name: string };
}

const API_KEY_PUBLIC_SELECT = {
  id: true,
  orgId: true,
  projectId: true,
  name: true,
  prefix: true,
  createdById: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  createdBy: { select: { name: true } },
} as const;

function computeStatus(row: Pick<ApiKeyRow, "revokedAt" | "expiresAt">, now: Date): ApiKeyStatus {
  if (row.revokedAt !== null) return "REVOKED";
  if (row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return "ACTIVE";
}

function toApiKey(row: ApiKeyRow, now: Date): ApiKey {
  return {
    id: row.id,
    orgId: row.orgId,
    projectId: row.projectId,
    name: row.name,
    prefix: row.prefix,
    createdById: row.createdById,
    createdByName: row.createdBy.name,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    status: computeStatus(row, now),
    createdAt: row.createdAt.toISOString(),
  };
}

export class ApiKeyService {
  private readonly now: () => Date;

  constructor(
    private readonly db: PrismaClient,
    now?: () => Date,
  ) {
    this.now = now ?? (() => new Date());
  }

  private async lockOrgAndVerifyManageAccess(
    tx: Pick<ReturnType<typeof createTenantDb>, "$queryRaw" | "project" | "orgMember">,
    ctx: TenantRequestContext,
    projectId: string,
  ): Promise<void> {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Organization" WHERE "id" = ${ctx.orgId} AND "deletedAt" IS NULL FOR UPDATE`;
    if (locked.length !== 1) throw new ApiError(404, PROJECT_NOT_FOUND);

    const liveProject = await tx.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    if (!liveProject) throw new ApiError(404, PROJECT_NOT_FOUND);

    const allowed = await tx.orgMember.count({
      where: { userId: ctx.userId, role: { in: rolesAtLeast(ctx.minRole) } },
    });
    if (allowed !== 1) throw new ApiError(403, FORBIDDEN);
  }

  /** Lists project API keys (prefix + metadata only; never selects keyHash or plaintext). */
  async list(ctx: TenantRequestContext): Promise<ApiKey[]> {
    const projectId = projectIdOf(ctx);
    const now = this.now();
    const rows = await createTenantDb(this.db, ctx).apiKey.findMany({
      where: { projectId },
      select: API_KEY_PUBLIC_SELECT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return rows.map((row) => toApiKey(row, now));
  }

  /** Generates a project-scoped API key, storing only its SHA-256 hash and returning plaintext once. */
  async create(ctx: TenantRequestContext, body: CreateApiKeyBody): Promise<CreatedApiKey> {
    const projectId = projectIdOf(ctx);
    const now = this.now();
    let expiresAt: Date | null = null;
    if (body.expiresAt !== undefined) {
      expiresAt = new Date(body.expiresAt);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
        throw new ApiError(400, "Expiration date must be in the future.", "VALIDATION_ERROR");
      }
    }

    const { plaintextKey, prefix, keyHash } = generateApiKeySecret();

    const row = await createTenantDb(this.db, ctx).$transaction(async (tx) => {
      await this.lockOrgAndVerifyManageAccess(tx, ctx, projectId);
      return tx.apiKey.create({
        data: {
          orgId: ctx.orgId,
          projectId,
          name: body.name,
          prefix,
          keyHash,
          createdById: ctx.userId,
          expiresAt,
        },
        select: API_KEY_PUBLIC_SELECT,
      });
    });

    return { ...toApiKey(row, now), plaintextKey };
  }

  /** Soft-revokes a project API key immediately, enforcing live tenant & role checks. */
  async revoke(ctx: TenantRequestContext, keyId: string): Promise<void> {
    if (!ApiKeyIdSchema.safeParse(keyId).success) {
      throw new ApiError(404, NOT_FOUND);
    }
    const projectId = projectIdOf(ctx);
    const now = this.now();

    await createTenantDb(this.db, ctx).$transaction(async (tx) => {
      await this.lockOrgAndVerifyManageAccess(tx, ctx, projectId);
      const updated = await tx.apiKey.updateMany({
        where: { id: keyId, revokedAt: null },
        data: { revokedAt: now },
      });
      if (updated.count !== 1) throw new ApiError(404, NOT_FOUND);
    });
  }
}
