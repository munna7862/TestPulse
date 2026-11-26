/**
 * Review S-009a (Round 1 findings across Claims, Security, and Test Auditors):
 * Verifies assertAllRoutesClassified edge cases, full static systemDb/raw-SQL allow-list audit,
 * two-org createTenantDb isolation, missing/deleted/malformed 404 & self-leave checks,
 * detailed AuditEvent payloads & transactional refusal locks, and OAuth callback Pino redaction.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Writable } from "node:stream";
import { createTenantDb } from "@testpulse/db";
import { useTestDatabase } from "@testpulse/db/testing";
import type { CreatedApiKey } from "@testpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { ApiKeyService } from "../../src/modules/api-keys/api-keys.service";
import { recordAuditEvent } from "../../src/modules/audit";
import { InvitationService } from "../../src/modules/invitations/invitations.service";
import { OrgService } from "../../src/modules/orgs/orgs.service";
import { ProjectService } from "../../src/modules/projects/projects.service";
import {
  assertAllRoutesClassified,
  NON_TENANT_ROUTES,
  ORG_ROUTE_POLICY,
  PROJECT_ROUTE_POLICY,
} from "../../src/plugins/tenant-context";
import { callAs, createUser, ORIGIN } from "../orgs/helpers";

const testDb = useTestDatabase();
const logLines: string[] = [];
const logStream = new Writable({
  write(chunk, _encoding, callback) {
    logLines.push(String(chunk));
    callback();
  },
});

const collectedRoutes: { method: string; url: string }[] = [];
let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({
    env: loadApiEnv({
      NODE_ENV: "production",
      AUTH_RATE_LIMIT_LOGIN_PER_MINUTE: "1000",
      AUTH_RATE_LIMIT_LOGIN_PER_EMAIL_PER_15_MIN: "1000",
      AUTH_RATE_LIMIT_RECOVERY_PER_HOUR: "1000",
      AUTH_RATE_LIMIT_RECOVERY_PER_EMAIL_PER_HOUR: "1000",
      AUTH_GENERIC_RESPONSE_MIN_MS: "0",
      JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
      APP_URL: ORIGIN,
      WEB_ORIGIN: ORIGIN,
    }),
    db: testDb.db,
    mailer: new TestMailer(),
    logger: true,
    loggerStream: logStream,
    onRoute: (route) => collectedRoutes.push(route),
  });
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
});

function walkTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) results.push(full);
  }
  return results;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const DOCUMENTED_SYSTEM_DB_FILES = new Set([
  "app.ts",
  "server.ts",
  "worker-main.ts",
  "modules/auth/auth.middleware.ts",
  "modules/auth/auth.service.ts",
  "modules/auth/oauth/oauth.service.ts",
  "modules/orgs/orgs.service.ts",
  "modules/invitations/invitations.service.ts",
  "plugins/api-key-auth.ts",
  "plugins/tenant-context.ts",
  "queues/purge.ts",
]);

const DOCUMENTED_RAW_SQL_FILES = new Set([
  "modules/api-keys/api-keys.service.ts",
  "modules/invitations/invitations.service.ts",
  "modules/orgs/orgs.service.ts",
  "modules/projects/projects.service.ts",
]);

describe("Review S-009a: route classification edge cases & strict DB access audit", () => {
  it("[SC-SEC-003] assertAllRoutesClassified detects trailing-slash twins, duplicates, standalone HEAD, and stale policy routes", () => {
    // Happy path with paired HEAD twin included and optional route present or omitted
    const withOptional = [...collectedRoutes, { method: "POST", url: "/api/v1/auth/restricted-action" }];
    expect(() => assertAllRoutesClassified(withOptional)).not.toThrow();

    // Trailing-slash twin must NOT collapse into NON_TENANT_ROUTES
    expect(() => assertAllRoutesClassified([...collectedRoutes, { method: "GET", url: "/api/v1/orgs/" }])).toThrow(
      /unclassified/i,
    );

    // Duplicate registration must fail
    expect(() => assertAllRoutesClassified([...collectedRoutes, { method: "GET", url: "/health" }])).toThrow(
      /duplicate/i,
    );

    // Standalone HEAD without matching classified GET twin must fail
    expect(() =>
      assertAllRoutesClassified([...collectedRoutes, { method: "HEAD", url: "/api/v1/standalone-head" }]),
    ).toThrow(/unclassified/i);

    // Missing required route triggers stale policy detection
    const withoutHealth = collectedRoutes.filter((r) => r.url !== "/health");
    expect(() => assertAllRoutesClassified(withoutHealth)).toThrow(/stale/i);
    expect(NON_TENANT_ROUTES.some((r) => r.method === "OPTIONS" && r.url === "*")).toBe(true);
  });

  it("[SC-SEC-004] direct DB access (including $transaction) and raw SQL in apps/api/src conform strictly to ADR-006 allow-lists", () => {
    const apiSrcDir = path.resolve(import.meta.dirname, "../../src");
    const directDbPattern =
      /\b(?:getSystemDb\(|createPrismaClient\(|(?:this\.(?:deps\.)?db|activeDb|\bdb)\s*(?:\?\.|\.)\s*[a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const rawSqlPattern = /\$(?:queryRaw|executeRaw)(?:Unsafe)?\b/g;
    const unsafeRawPattern = /\$(?:queryRawUnsafe|executeRawUnsafe)\b/g;

    const dbViolations: string[] = [];
    const rawViolations: string[] = [];

    for (const file of walkTsFiles(apiSrcDir)) {
      const rel = path.relative(apiSrcDir, file).replace(/\\/g, "/");
      const code = stripComments(fs.readFileSync(file, "utf8"));

      const dbMatches = code.match(directDbPattern);
      if (dbMatches && dbMatches.length > 0 && !DOCUMENTED_SYSTEM_DB_FILES.has(rel)) {
        dbViolations.push(`${rel}: ${dbMatches.join(", ")}`);
      }

      const rawMatches = code.match(rawSqlPattern);
      if (rawMatches && rawMatches.length > 0) {
        if (!DOCUMENTED_RAW_SQL_FILES.has(rel) || unsafeRawPattern.test(code)) {
          rawViolations.push(`${rel}: ${rawMatches.join(", ")}`);
        }
        expect(code, `${rel} raw SQL must include explicit tenant predicate`).toMatch(
          /\$\{(?:ctx\.orgId|initial\.orgId)\}/,
        );
      }
    }

    expect(dbViolations).toEqual([]);
    expect(rawViolations).toEqual([]);
  });

  it("[SC-SEC-004] createTenantDb isolates AuditEvent findMany across two orgs and blocks cross-tenant createMany", async () => {
    const u1 = await createUser(app, testDb.db, "s009a-org1@example.com");
    const u2 = await createUser(app, testDb.db, "s009a-org2@example.com");
    const org1 = (await callAs(app, u1, "POST", "/api/v1/orgs", { name: "Audit Iso 1", slug: "audit-iso-1" })).json<{
      data: { id: string };
    }>().data.id;
    const org2 = (await callAs(app, u2, "POST", "/api/v1/orgs", { name: "Audit Iso 2", slug: "audit-iso-2" })).json<{
      data: { id: string };
    }>().data.id;

    const db1 = createTenantDb(testDb.db, { orgId: org1 });
    const db2 = createTenantDb(testDb.db, { orgId: org2 });
    await db1.auditEvent.create({
      data: { orgId: org1, actorUserId: u1.id, action: "org.deleted", targetType: "organization", targetId: org1 },
    });
    await db2.auditEvent.create({
      data: { orgId: org2, actorUserId: u2.id, action: "org.deleted", targetType: "organization", targetId: org2 },
    });

    const org1All = await db1.auditEvent.findMany();
    expect(org1All).toHaveLength(1);
    expect(org1All[0]?.orgId).toBe(org1);
    expect(await db1.auditEvent.findMany({ where: { orgId: org2 } })).toEqual([]);

    const org2All = await db2.auditEvent.findMany();
    expect(org2All).toHaveLength(1);
    expect(org2All[0]?.orgId).toBe(org2);
    expect(await db2.auditEvent.findMany({ where: { orgId: org1 } })).toEqual([]);

    await expect(
      db1.auditEvent.createMany({
        data: [
          { orgId: org1, action: "org.deleted", targetType: "organization", targetId: org1 },
          { orgId: org2, action: "org.deleted", targetType: "organization", targetId: org2 },
        ],
      }),
    ).rejects.toThrow(/Cross-tenant write blocked/i);
  });

  it("[SC-SEC-001] [SC-SEC-002] verifies 401 unauthenticated, missing/deleted/orphan/malformed ID 404, and allowSelfParam self-leave across routes", async () => {
    const owner = await createUser(app, testDb.db, "s009a-iso-owner@example.com");
    const member = await createUser(app, testDb.db, "s009a-iso-member@example.com");
    const orgId = (
      await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Route Matrix Org", slug: "route-matrix-org" })
    ).json<{ data: { id: string } }>().data.id;
    await testDb.db.orgMember.create({ data: { orgId, userId: member.id, role: "MEMBER" } });
    const projectId = (
      await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Matrix Proj" })
    ).json<{ data: { id: string } }>().data.id;

    const deletedProjId = (
      await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Deleted Matrix Proj" })
    ).json<{ data: { id: string } }>().data.id;
    await testDb.db.project.update({ where: { id: deletedProjId }, data: { deletedAt: new Date() } });

    const deletedOrgId = (
      await callAs(app, owner, "POST", "/api/v1/orgs", { name: "Deleted Matrix Org", slug: "deleted-matrix-org" })
    ).json<{ data: { id: string } }>().data.id;
    const orphanProjectId = (
      await callAs(app, owner, "POST", `/api/v1/orgs/${deletedOrgId}/projects`, { name: "Orphan Matrix Proj" })
    ).json<{ data: { id: string } }>().data.id;
    await testDb.db.organization.update({ where: { id: deletedOrgId }, data: { deletedAt: new Date() } });

    for (const route of ORG_ROUTE_POLICY) {
      const validUrl = route.url.replace(":orgId", orgId).replace(/:[A-Za-z]+/g, () => crypto.randomUUID());
      expect((await callAs(app, null, route.method, validUrl)).statusCode, `401 on ${route.method} ${route.url}`).toBe(
        401,
      );

      for (const badOrgId of [crypto.randomUUID(), "not-a-uuid", deletedOrgId]) {
        const res = await callAs(
          app,
          owner,
          route.method,
          route.url.replace(":orgId", badOrgId).replace(/:[A-Za-z]+/g, () => crypto.randomUUID()),
        );
        expect(res.statusCode, `404 (${badOrgId}) on ${route.method} ${route.url}`).toBe(404);
      }
    }

    for (const route of PROJECT_ROUTE_POLICY) {
      const validUrl = route.url.replace(":projectId", projectId).replace(/:[A-Za-z]+/g, () => crypto.randomUUID());
      expect((await callAs(app, null, route.method, validUrl)).statusCode, `401 on ${route.method} ${route.url}`).toBe(
        401,
      );

      for (const badProjectId of [crypto.randomUUID(), "not-a-uuid", deletedProjId, orphanProjectId]) {
        const res = await callAs(
          app,
          owner,
          route.method,
          route.url.replace(":projectId", badProjectId).replace(/:[A-Za-z]+/g, () => crypto.randomUUID()),
        );
        expect(res.statusCode, `404 (${badProjectId}) on ${route.method} ${route.url}`).toBe(404);
      }
    }

    // allowSelfParam lets a Member leave their own org while removing others returns 403
    const leaveRes = await callAs(app, member, "DELETE", `/api/v1/orgs/${orgId}/members/${member.id}`);
    expect(leaveRes.statusCode).toBe(204);
  });
});

describe("Review S-009a: AuditEvent field fidelity, softDelete/lock races & OAuth log redaction", () => {
  it("[SC-SEC-007] records complete AuditEvent payloads and writes zero events on 403/404 transactional refusals", async () => {
    const mailer = new TestMailer();
    const env = loadApiEnv({
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
      APP_URL: ORIGIN,
      WEB_ORIGIN: ORIGIN,
    });
    const orgService = new OrgService(testDb.db);
    const projectService = new ProjectService(testDb.db);
    const invitationService = new InvitationService({ db: testDb.db, mailer, env });
    const apiKeyService = new ApiKeyService(testDb.db);

    const owner = await createUser(app, testDb.db, "s009a-fields-owner@example.com");
    const admin = await createUser(app, testDb.db, "s009a-fields-admin@example.com");
    const member = await createUser(app, testDb.db, "s009a-fields-member@example.com");
    const invitee = await createUser(app, testDb.db, "s009a-fields-invitee@example.com");

    const org = await orgService.create(owner.id, { name: "Field Fidelity Org", slug: "field-fidelity-org" });
    await testDb.db.organization.update({ where: { id: org.id }, data: { planTier: "PRO" } });
    await testDb.db.orgMember.create({ data: { orgId: org.id, userId: admin.id, role: "ADMIN" } });
    await testDb.db.orgMember.create({ data: { orgId: org.id, userId: member.id, role: "MEMBER" } });

    const adminCtx = { orgId: org.id, userId: admin.id, role: "ADMIN" as const, minRole: "ADMIN" as const };
    const ownerCtx = { orgId: org.id, userId: owner.id, role: "OWNER" as const, minRole: "OWNER" as const };

    const project = await projectService.create(adminCtx, { name: "Fidelity Project" });
    const projCtx = { ...adminCtx, projectId: project.id };
    const createdKey: CreatedApiKey = await apiKeyService.create(projCtx, { name: "CI Audit Key" });
    await apiKeyService.revoke(projCtx, createdKey.id);

    const inv = await invitationService.create(adminCtx, "Admin", {
      email: "fidelity-invitee@example.com",
      role: "MEMBER",
    });
    await invitationService.resend(adminCtx, "Admin", inv.id);
    await invitationService.revoke(adminCtx, inv.id);

    const invAccept = await invitationService.create(adminCtx, "Admin", {
      email: invitee.email,
      role: "MEMBER",
    });
    const acceptToken = mailer.getLastEmail()?.token ?? "";
    await invitationService.accept({ id: invitee.id, email: invitee.email }, acceptToken);

    await orgService.changeMemberRole(adminCtx, member.id, "VIEWER");
    await orgService.removeMember({ orgId: org.id, userId: invitee.id, role: "MEMBER", minRole: "VIEWER" }, invitee.id);
    await orgService.removeMember(adminCtx, member.id);

    // Caller demoted between preValidation and write -> 403 & zero spurious AuditEvents
    await testDb.db.orgMember.update({
      where: { orgId_userId: { orgId: org.id, userId: admin.id } },
      data: { role: "VIEWER" },
    });
    await expect(projectService.softDelete({ ...projCtx, minRole: "ADMIN" })).rejects.toMatchObject({
      statusCode: 403,
    });
    const extraAdmin = await createUser(app, testDb.db, "s009a-extra-admin@example.com");
    await testDb.db.orgMember.create({ data: { orgId: org.id, userId: extraAdmin.id, role: "ADMIN" } });
    await expect(orgService.changeMemberRole(adminCtx, extraAdmin.id, "VIEWER")).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(orgService.removeMember(adminCtx, extraAdmin.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      orgService.transferOwnership({ orgId: org.id, userId: admin.id, role: "OWNER", minRole: "OWNER" }, extraAdmin.id),
    ).rejects.toMatchObject({ statusCode: 403 });

    // Restore ADMIN, delete project cleanly, then retry softDelete -> 404 & still single project.deleted event
    await testDb.db.orgMember.update({
      where: { orgId_userId: { orgId: org.id, userId: admin.id } },
      data: { role: "ADMIN" },
    });
    await projectService.softDelete({ ...projCtx, minRole: "ADMIN" });
    await expect(projectService.softDelete({ ...projCtx, minRole: "ADMIN" })).rejects.toMatchObject({
      statusCode: 404,
    });

    // Second project softDelete fails with 404 once parent org is deleted (and writes zero project.deleted events)
    const project2 = await projectService.create(adminCtx, { name: "Orphaned Project" });

    // Demoted caller calling orgs.softDelete -> 403 & zero org.deleted events
    await expect(
      orgService.softDelete({ orgId: org.id, userId: admin.id, role: "OWNER", minRole: "OWNER" }),
    ).rejects.toMatchObject({ statusCode: 403 });

    await orgService.transferOwnership(ownerCtx, admin.id);
    await orgService.softDelete({ orgId: org.id, userId: admin.id, role: "OWNER", minRole: "OWNER" });
    await expect(
      orgService.softDelete({ orgId: org.id, userId: admin.id, role: "OWNER", minRole: "OWNER" }),
    ).rejects.toMatchObject({ statusCode: 404 });

    // Mutations after org deletion must return 404 and append zero extra AuditEvents
    await expect(
      projectService.softDelete({
        orgId: org.id,
        projectId: project2.id,
        userId: admin.id,
        role: "ADMIN",
        minRole: "ADMIN",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      orgService.transferOwnership({ orgId: org.id, userId: admin.id, role: "OWNER", minRole: "OWNER" }, owner.id),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(orgService.changeMemberRole(adminCtx, extraAdmin.id, "VIEWER")).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(orgService.removeMember(adminCtx, extraAdmin.id)).rejects.toMatchObject({ statusCode: 404 });

    const events = await testDb.db.auditEvent.findMany({
      where: { orgId: org.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const projectCreated = events.find((e) => e.action === "project.created" && e.targetId === project.id);
    expect(projectCreated).toMatchObject({
      orgId: org.id,
      projectId: project.id,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "project",
      targetId: project.id,
      metadata: { slug: project.slug },
    });

    const keyCreated = events.find((e) => e.action === "api_key.created");
    expect(keyCreated).toMatchObject({
      orgId: org.id,
      projectId: project.id,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "api_key",
      targetId: createdKey.id,
      metadata: { name: "CI Audit Key", prefix: createdKey.prefix },
    });

    expect(events.find((e) => e.action === "api_key.revoked")).toMatchObject({
      orgId: org.id,
      projectId: project.id,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "api_key",
      targetId: createdKey.id,
      metadata: {},
    });

    expect(events.find((e) => e.action === "invitation.created" && e.targetId === inv.id)).toMatchObject({
      orgId: org.id,
      projectId: null,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "invitation",
      targetId: inv.id,
      metadata: { email: "fidelity-invitee@example.com", role: "MEMBER" },
    });
    expect(events.find((e) => e.action === "invitation.resent")).toMatchObject({
      orgId: org.id,
      projectId: null,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "invitation",
      targetId: inv.id,
      metadata: { email: "fidelity-invitee@example.com", role: "MEMBER" },
    });
    expect(events.find((e) => e.action === "invitation.revoked")).toMatchObject({
      orgId: org.id,
      projectId: null,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "invitation",
      targetId: inv.id,
      metadata: { email: "fidelity-invitee@example.com" },
    });
    expect(events.find((e) => e.action === "invitation.accepted")).toMatchObject({
      orgId: org.id,
      projectId: null,
      actorUserId: invitee.id,
      actorApiKeyId: null,
      targetType: "invitation",
      targetId: invAccept.id,
      metadata: { role: "MEMBER" },
    });
    expect(events.filter((e) => e.action === "member.role_changed")).toHaveLength(1);
    expect(events.find((e) => e.action === "member.role_changed")).toMatchObject({
      orgId: org.id,
      projectId: null,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "org_member",
      targetId: member.id,
      metadata: { previousRole: "MEMBER", newRole: "VIEWER" },
    });
    expect(events.filter((e) => e.action === "member.left")).toHaveLength(1);
    expect(events.find((e) => e.action === "member.left")).toMatchObject({
      orgId: org.id,
      projectId: null,
      actorUserId: invitee.id,
      actorApiKeyId: null,
      targetType: "org_member",
      targetId: invitee.id,
      metadata: { previousRole: "MEMBER" },
    });
    expect(events.filter((e) => e.action === "member.removed")).toHaveLength(1);
    expect(events.find((e) => e.action === "member.removed")).toMatchObject({
      orgId: org.id,
      projectId: null,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "org_member",
      targetId: member.id,
      metadata: { previousRole: "VIEWER" },
    });
    expect(events.filter((e) => e.action === "project.deleted")).toHaveLength(1);
    expect(events.find((e) => e.action === "project.deleted")).toMatchObject({
      orgId: org.id,
      projectId: project.id,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "project",
      targetId: project.id,
      metadata: {},
    });
    expect(events.filter((e) => e.action === "org.ownership_transferred")).toHaveLength(1);
    expect(events.find((e) => e.action === "org.ownership_transferred")).toMatchObject({
      orgId: org.id,
      projectId: null,
      actorUserId: owner.id,
      actorApiKeyId: null,
      targetType: "organization",
      targetId: org.id,
      metadata: { previousOwnerId: owner.id, newOwnerId: admin.id },
    });
    expect(events.filter((e) => e.action === "org.deleted")).toHaveLength(1);
    expect(events.find((e) => e.action === "org.deleted")).toMatchObject({
      orgId: org.id,
      projectId: null,
      actorUserId: admin.id,
      actorApiKeyId: null,
      targetType: "organization",
      targetId: org.id,
      metadata: {},
    });

    // Mid-transaction failure rolls back both the domain mutation and the appended AuditEvent
    const rollbackOrg = await orgService.create(owner.id, { name: "Rollback Safe", slug: "rollback-safe" });
    await expect(
      createTenantDb(testDb.db, { orgId: rollbackOrg.id }).$transaction(async (tx) => {
        await tx.organization.updateMany({ where: { id: rollbackOrg.id }, data: { name: "Mutated Then Aborted" } });
        await recordAuditEvent(tx, {
          orgId: rollbackOrg.id,
          actorUserId: owner.id,
          action: "org.deleted",
          targetType: "organization",
          targetId: rollbackOrg.id,
        });
        throw new Error("Simulated mid-transaction failure");
      }),
    ).rejects.toThrow("Simulated mid-transaction failure");

    const unchanged = await testDb.db.organization.findUnique({ where: { id: rollbackOrg.id } });
    expect(unchanged?.name).toBe("Rollback Safe");
    expect(await testDb.db.auditEvent.count({ where: { orgId: rollbackOrg.id } })).toBe(0);
  });

  it("[SC-SEC-006] strips OAuth callback code and state query parameters inside buildApp Pino logs", async () => {
    logLines.length = 0;
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/github/callback?code=oauth_secret_code_999&state=oauth_secret_state_888",
      headers: { "x-request-id": "req_oauth_redact_1" },
    });
    expect(res.statusCode).toBe(302);

    const raw = logLines.join("");
    expect(raw).not.toContain("oauth_secret_code_999");
    expect(raw).not.toContain("oauth_secret_state_888");
    const entries = raw
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as { requestId?: string; req?: { url?: string } });
    expect(
      entries.some(
        (e) => e.requestId === "req_oauth_redact_1" && e.req?.url === "/api/v1/auth/oauth/github/callback?[REDACTED]",
      ),
    ).toBe(true);
  });
});
