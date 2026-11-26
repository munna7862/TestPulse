/**
 * Acceptance S-009a AC2-AC3 (planning/slices/S-009a-audit-isolation-logging.md):
 * Transactional AuditEvent recording across all security mutations, secret-free Pino request logging
 * with requestId + tenant context (orgId, projectId, apiKeyId), and purge cascade preservation rules.
 */
import { Writable } from "node:stream";
import sensible from "@fastify/sensible";
import { useTestDatabase } from "@testpulse/db/testing";
import type { CreatedApiKey } from "@testpulse/shared";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import { LOG_REDACT_PATHS, redactRequestUrl } from "../../src/log-redaction";
import { apiKeyContextOf, createApiKeyAuthHook } from "../../src/plugins/api-key-auth";
import { registerErrorHandling } from "../../src/plugins/error-handler";
import { purgeSoftDeletedOrg, purgeSoftDeletedProject } from "../../src/queues/purge";
import { callAs, createUser, ORIGIN } from "../orgs/helpers";

const testDb = useTestDatabase();
const logLines: string[] = [];
const logStream = new Writable({
  write(chunk, _encoding, callback) {
    logLines.push(String(chunk));
    callback();
  },
});

const TEST_ENV = loadApiEnv({
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
});

const mailer = new TestMailer();
let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({
    env: TEST_ENV,
    db: testDb.db,
    mailer,
    logger: true,
    loggerStream: logStream,
  });
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
});

function parseCapturedLogs(): Record<string, unknown>[] {
  return logLines
    .join("")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("Acceptance S-009a AC2-AC3: AuditEvent recording & structured redacted request logs", () => {
  it("[SC-SEC-007] records transactional AuditEvent rows for security actions, zero events on rejections, and honors purge retention", async () => {
    const owner = await createUser(app, testDb.db, "audit-owner@example.com");
    const admin = await createUser(app, testDb.db, "audit-admin@example.com");
    const member = await createUser(app, testDb.db, "audit-member@example.com");
    const invitee = await createUser(app, testDb.db, "audit-invitee@example.com");

    const orgRes = await callAs(app, owner, "POST", "/api/v1/orgs", {
      name: "Audit Org",
      slug: "audit-org",
    });
    const orgId = orgRes.json<{ data: { id: string } }>().data.id;
    await testDb.db.orgMember.create({ data: { orgId, userId: admin.id, role: "ADMIN" } });
    await testDb.db.orgMember.create({ data: { orgId, userId: member.id, role: "MEMBER" } });
    await testDb.db.organization.update({ where: { id: orgId }, data: { planTier: "PRO" } });

    // 1. project.created & failed project.create (403 -> zero events)
    const deniedProj = await callAs(app, member, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Denied" });
    expect(deniedProj.statusCode).toBe(403);

    const proj1Res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Proj Keep" });
    expect(proj1Res.statusCode).toBe(201);
    const proj1Id = proj1Res.json<{ data: { id: string } }>().data.id;

    const proj2Res = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/projects`, { name: "Proj Delete" });
    expect(proj2Res.statusCode).toBe(201);
    const proj2Id = proj2Res.json<{ data: { id: string } }>().data.id;

    // 2. api_key.created & api_key.revoked (+ 403 Member rejection creates zero events)
    const deniedKey = await callAs(app, member, "POST", `/api/v1/projects/${proj1Id}/api-keys`, { name: "Nope" });
    expect(deniedKey.statusCode).toBe(403);

    const keyRes = await callAs(app, admin, "POST", `/api/v1/projects/${proj1Id}/api-keys`, { name: "CI Runner" });
    expect(keyRes.statusCode).toBe(201);
    const createdKey = keyRes.json<{ data: CreatedApiKey }>().data;

    const revokeKeyRes = await callAs(app, admin, "DELETE", `/api/v1/projects/${proj1Id}/api-keys/${createdKey.id}`);
    expect(revokeKeyRes.statusCode).toBe(204);

    // 3. invitation.created, invitation.resent, invitation.accepted, invitation.revoked
    const inv1Res = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: invitee.email,
      role: "MEMBER",
    });
    expect(inv1Res.statusCode).toBe(201);
    const inv1Id = inv1Res.json<{ data: { id: string } }>().data.id;

    const resendRes = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations/${inv1Id}/resend`);
    expect(resendRes.statusCode).toBe(200);
    const acceptToken = mailer.getLastEmail()?.token ?? "";
    expect(acceptToken.length).toBeGreaterThan(0);

    const acceptRes = await callAs(app, invitee, "POST", "/api/v1/invitations/accept", { token: acceptToken });
    expect(acceptRes.statusCode).toBe(200);

    const inv2Res = await callAs(app, admin, "POST", `/api/v1/orgs/${orgId}/invitations`, {
      email: "revoked-invitee@example.com",
      role: "VIEWER",
    });
    expect(inv2Res.statusCode).toBe(201);
    const inv2Id = inv2Res.json<{ data: { id: string } }>().data.id;
    const revokeInvRes = await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/invitations/${inv2Id}`);
    expect(revokeInvRes.statusCode).toBe(204);

    // 4. member.role_changed, member.left, member.removed
    const roleRes = await callAs(app, admin, "PATCH", `/api/v1/orgs/${orgId}/members/${invitee.id}`, {
      role: "VIEWER",
    });
    expect(roleRes.statusCode).toBe(200);

    const leaveRes = await callAs(app, invitee, "DELETE", `/api/v1/orgs/${orgId}/members/${invitee.id}`);
    expect(leaveRes.statusCode).toBe(204);

    const removeRes = await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}/members/${member.id}`);
    expect(removeRes.statusCode).toBe(204);

    // 5. project.deleted + org.ownership_transferred + org.deleted
    const delProjRes = await callAs(app, admin, "DELETE", `/api/v1/projects/${proj2Id}`);
    expect(delProjRes.statusCode).toBe(204);

    const xferRes = await callAs(app, owner, "POST", `/api/v1/orgs/${orgId}/transfer-ownership`, {
      userId: admin.id,
    });
    expect(xferRes.statusCode).toBe(200);

    const deniedOrgDel = await callAs(app, owner, "DELETE", `/api/v1/orgs/${orgId}`);
    expect(deniedOrgDel.statusCode).toBe(403);

    // Purge proj2 before deleting org: org-level project.deleted AuditEvent must survive project purge.
    await purgeSoftDeletedProject(testDb.db, orgId, proj2Id);

    const delOrgRes = await callAs(app, admin, "DELETE", `/api/v1/orgs/${orgId}`);
    expect(delOrgRes.statusCode).toBe(204);

    const events = await testDb.db.auditEvent.findMany({
      where: { orgId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const actions = events.map((e) => e.action);
    expect(actions).toEqual([
      "project.created",
      "project.created",
      "api_key.created",
      "api_key.revoked",
      "invitation.created",
      "invitation.resent",
      "invitation.accepted",
      "invitation.created",
      "invitation.revoked",
      "member.role_changed",
      "member.left",
      "member.removed",
      "project.deleted",
      "org.ownership_transferred",
      "org.deleted",
    ]);

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(createdKey.plaintextKey);
    expect(serialized).not.toContain(acceptToken);
    expect(events.find((e) => e.action === "api_key.created")?.projectId).toBe(proj1Id);
    expect(events.find((e) => e.action === "project.deleted")?.targetId).toBe(proj2Id);
    expect(events.find((e) => e.action === "org.ownership_transferred")?.actorUserId).toBe(owner.id);
    expect(events.find((e) => e.action === "org.deleted")?.actorUserId).toBe(admin.id);

    // Purging the soft-deleted org cascades all its AuditEvent rows cleanly.
    await purgeSoftDeletedOrg(testDb.db, orgId);
    expect(await testDb.db.auditEvent.count({ where: { orgId } })).toBe(0);
  });

  it("[SC-SEC-006] logs requestId, orgId, projectId and apiKeyId without leaking passwords, cookies, tokens, or API keys", async () => {
    const email = "log-audit@example.com";
    const password = "SuperSecretLogPass123!";
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email, password, name: "Log Audit User" },
    });
    const user = await testDb.db.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });

    logLines.length = 0;

    // 1. Login
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });
    expect(loginRes.statusCode).toBe(200);
    const accessToken = loginRes.cookies.find((c) => c.name === "tp_access")?.value ?? "";
    const refreshToken = loginRes.cookies.find((c) => c.name === "tp_refresh")?.value ?? "";

    // 2. Refresh
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { origin: ORIGIN },
      cookies: { tp_refresh: refreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);
    const refreshedAccess = refreshRes.cookies.find((c) => c.name === "tp_access")?.value ?? "";
    const refreshedRefresh = refreshRes.cookies.find((c) => c.name === "tp_refresh")?.value ?? "";

    // 3. Create org + project -> org route & project key creation route
    const orgRes = await app.inject({
      method: "POST",
      url: "/api/v1/orgs",
      headers: { origin: ORIGIN },
      cookies: { tp_access: refreshedAccess },
      payload: { name: "Logged Org", slug: "logged-org" },
    });
    const orgId = orgRes.json<{ data: { id: string } }>().data.id;
    const getOrgRes = await app.inject({
      method: "GET",
      url: `/api/v1/orgs/${orgId}`,
      headers: { origin: ORIGIN, "x-request-id": "req_org_trace_1" },
      cookies: { tp_access: refreshedAccess },
    });
    expect(getOrgRes.statusCode).toBe(200);

    const projRes = await app.inject({
      method: "POST",
      url: `/api/v1/orgs/${orgId}/projects`,
      headers: { origin: ORIGIN },
      cookies: { tp_access: refreshedAccess },
      payload: { name: "Logged Project" },
    });
    const projectId = projRes.json<{ data: { id: string } }>().data.id;

    const createKeyRes = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${projectId}/api-keys`,
      headers: { origin: ORIGIN, "x-request-id": "req_proj_trace_1" },
      cookies: { tp_access: refreshedAccess },
      payload: { name: "Logged Key" },
    });
    expect(createKeyRes.statusCode).toBe(201);
    const createdKey = createKeyRes.json<{ data: CreatedApiKey }>().data;

    const rawLogs = logLines.join("");
    expect(rawLogs).not.toContain(password);
    expect(rawLogs).not.toContain(accessToken);
    expect(rawLogs).not.toContain(refreshToken);
    expect(rawLogs).not.toContain(refreshedAccess);
    expect(rawLogs).not.toContain(refreshedRefresh);
    expect(rawLogs).not.toContain(createdKey.plaintextKey);

    const parsed = parseCapturedLogs();
    expect(parsed.every((entry) => typeof entry.requestId === "string" && entry.requestId.length > 0)).toBe(true);
    expect(parsed.some((entry) => entry.requestId === "req_org_trace_1" && entry.orgId === orgId)).toBe(true);
    expect(
      parsed.some(
        (entry) => entry.requestId === "req_proj_trace_1" && entry.orgId === orgId && entry.projectId === projectId,
      ),
    ).toBe(true);

    // 4. API-key-authenticated route logging binds orgId, projectId & apiKeyId without leaking Bearer token
    const ingestLines: string[] = [];
    const ingestStream = new Writable({
      write(chunk, _encoding, callback) {
        ingestLines.push(String(chunk));
        callback();
      },
    });
    const ingestProbe = Fastify({
      logger: {
        level: "info",
        stream: ingestStream,
        redact: { paths: LOG_REDACT_PATHS, censor: "[REDACTED]" },
        serializers: {
          req: (request: FastifyRequest) => ({
            method: request.method,
            url: redactRequestUrl(request.url),
            host: request.host,
            remoteAddress: request.ip,
            remotePort: request.socket.remotePort,
          }),
        },
      },
      requestIdHeader: "x-request-id",
      requestIdLogLabel: "requestId",
      genReqId: () => "req_ingest_probe",
    }).withTypeProvider<ZodTypeProvider>();
    ingestProbe.setValidatorCompiler(validatorCompiler);
    ingestProbe.setSerializerCompiler(serializerCompiler);
    await ingestProbe.register(sensible);
    registerErrorHandling(ingestProbe);
    ingestProbe.post(
      "/api/v1/ingest/probe",
      { preHandler: createApiKeyAuthHook({ db: testDb.db }) },
      async (request) => ({ success: true as const, data: apiKeyContextOf(request) }),
    );
    await ingestProbe.ready();

    try {
      const ingestRes = await ingestProbe.inject({
        method: "POST",
        url: "/api/v1/ingest/probe",
        headers: {
          authorization: `Bearer ${createdKey.plaintextKey}`,
          "x-request-id": "req_ingest_trace_1",
        },
      });
      expect(ingestRes.statusCode).toBe(200);
      const rawIngestLogs = ingestLines.join("");
      expect(rawIngestLogs).not.toContain(createdKey.plaintextKey);
      const ingestEntries = rawIngestLogs
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l) as Record<string, unknown>);
      expect(
        ingestEntries.some(
          (e) =>
            e.requestId === "req_ingest_trace_1" &&
            e.orgId === orgId &&
            e.projectId === projectId &&
            e.apiKeyId === createdKey.id,
        ),
      ).toBe(true);
      expect(user.id).toBeTruthy();
    } finally {
      await ingestProbe.close();
    }
  });
});
