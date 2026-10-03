import type { PrismaClient } from "@testpulse/db";
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify";
import { buildApp } from "../../src/app";
import { loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";

export const ORIGIN = "https://testpulse.example.com";
const PASSWORD = "ValidPassword123!";

export async function createOrgTestApp(db: PrismaClient): Promise<FastifyInstance> {
  const app = await buildApp({
    env: loadApiEnv({
      NODE_ENV: "production",
      // Not a rate-limit test: many logins from one address must not trip the limits.
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
    db,
    mailer: new TestMailer(),
    logger: false,
  });
  await app.ready();
  return app;
}

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

/** Registers a user through the API, optionally marks the email verified, and logs in. */
export async function createUser(
  app: FastifyInstance,
  db: PrismaClient,
  email: string,
  { verified = true }: { verified?: boolean } = {},
): Promise<TestUser> {
  await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password: PASSWORD, name: email },
  });
  const user = await db.user.update({
    where: { email },
    data: { emailVerifiedAt: verified ? new Date() : null },
  });
  const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email, password: PASSWORD } });
  const accessToken = login.cookies.find((c) => c.name === "tp_access")?.value ?? "";
  if (!accessToken) throw new Error(`login failed for ${email}: ${login.statusCode}`);
  return { id: user.id, email, accessToken };
}

/** Calls the API as `user` with session cookies and a same-origin Origin header (CSRF). */
export function callAs(
  app: FastifyInstance,
  user: TestUser | null,
  method: NonNullable<InjectOptions["method"]>,
  url: string,
  payload?: InjectOptions["payload"],
): Promise<LightMyRequestResponse> {
  return app.inject({
    method,
    url,
    headers: { origin: ORIGIN },
    ...(user ? { cookies: { tp_access: user.accessToken } } : {}),
    ...(payload === undefined ? {} : { payload }),
  });
}
