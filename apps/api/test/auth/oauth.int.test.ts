import crypto from "node:crypto";
import { truncateAll, useTestDatabase } from "@testpulse/db/testing";
import { ApiFailureSchema, apiSuccess, AuthMeResponseSchema, ListOAuthAccountsResponseSchema } from "@testpulse/shared";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { type ApiEnv, loadApiEnv } from "../../src/env";
import { TestMailer } from "../../src/lib/mailer";
import {
  createStateCodec,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_TTL_SECONDS,
} from "../../src/modules/auth/oauth/state-cookie";

const ORIGIN = "https://testpulse.example.com";
const PASSWORD = "ValidPassword123!";
const BASE_ENV = {
  NODE_ENV: "production",
  JWT_ACCESS_SECRET: "test-access-secret-at-least-32-chars-long",
  JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-chars-long",
  APP_URL: ORIGIN,
  WEB_ORIGIN: ORIGIN,
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  GITHUB_CLIENT_ID: "github-client-id",
  GITHUB_CLIENT_SECRET: "github-client-secret",
  OAUTH_RATE_LIMIT_PER_MINUTE: "1000",
};

// ---------------------------------------------------------------------------------------------
// Mocked identity providers (MSW). No real OAuth traffic is ever sent.
// ---------------------------------------------------------------------------------------------
interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}
interface MockState {
  tokenCalls: Array<{ provider: "google" | "github"; body: URLSearchParams; authorization: string | null }>;
  google: {
    sub: string;
    email: string | undefined;
    emailVerified: boolean;
    name: string;
    tokenStatus: number;
    userinfoStatus: number;
  };
  github: {
    id: number;
    login: string;
    name: string | null;
    publicEmail: string;
    emails: GitHubEmail[];
    tokenStatus: number;
    userStatus: number;
    emailsStatus: number;
  };
}

function freshMock(): MockState {
  return {
    tokenCalls: [],
    google: {
      sub: "g-1001",
      email: "oauth.google@example.com",
      emailVerified: true,
      name: "Gina Google",
      tokenStatus: 200,
      userinfoStatus: 200,
    },
    github: {
      id: 2002,
      login: "hubert",
      name: "Hubert Hub",
      publicEmail: "public.decoy@example.com",
      emails: [
        { email: "unverified@example.com", primary: false, verified: false },
        { email: "second@example.com", primary: false, verified: true },
        { email: "OAuth.GitHub@example.com", primary: true, verified: true },
      ],
      tokenStatus: 200,
      userStatus: 200,
      emailsStatus: 200,
    },
  };
}

let mock = freshMock();

const server = setupServer(
  http.post("https://oauth2.googleapis.com/token", async ({ request }) => {
    mock.tokenCalls.push({
      provider: "google",
      body: new URLSearchParams(await request.text()),
      authorization: request.headers.get("authorization"),
    });
    if (mock.google.tokenStatus >= 500) return new HttpResponse(null, { status: mock.google.tokenStatus });
    if (mock.google.tokenStatus !== 200) {
      return HttpResponse.json({ error: "invalid_grant" }, { status: mock.google.tokenStatus });
    }
    return HttpResponse.json({ access_token: "google-access-token", token_type: "Bearer", expires_in: 3600 });
  }),
  http.get("https://openidconnect.googleapis.com/v1/userinfo", ({ request }) => {
    if (request.headers.get("authorization") !== "Bearer google-access-token") {
      return HttpResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (mock.google.userinfoStatus !== 200) return HttpResponse.json({}, { status: mock.google.userinfoStatus });
    return HttpResponse.json({
      sub: mock.google.sub,
      ...(mock.google.email === undefined ? {} : { email: mock.google.email }),
      email_verified: mock.google.emailVerified,
      name: mock.google.name,
      picture: "https://lh3.googleusercontent.example/photo.jpg",
    });
  }),
  http.post("https://github.com/login/oauth/access_token", async ({ request }) => {
    mock.tokenCalls.push({
      provider: "github",
      body: new URLSearchParams(await request.text()),
      authorization: request.headers.get("authorization"),
    });
    if (mock.github.tokenStatus >= 500) return new HttpResponse(null, { status: mock.github.tokenStatus });
    if (mock.github.tokenStatus !== 200) {
      return HttpResponse.json({ error: "bad_verification_code" }, { status: mock.github.tokenStatus });
    }
    return HttpResponse.json({ access_token: "github-access-token", token_type: "bearer", scope: "read:user" });
  }),
  http.get("https://api.github.com/user", ({ request }) => {
    if (request.headers.get("authorization") !== "Bearer github-access-token") {
      return HttpResponse.json({ message: "Bad credentials" }, { status: 401 });
    }
    if (mock.github.userStatus !== 200) return HttpResponse.json({}, { status: mock.github.userStatus });
    return HttpResponse.json({
      id: mock.github.id,
      login: mock.github.login,
      name: mock.github.name,
      email: mock.github.publicEmail,
      avatar_url: "https://avatars.githubusercontent.example/u/2002",
    });
  }),
  http.get("https://api.github.com/user/emails", ({ request }) => {
    if (request.headers.get("authorization") !== "Bearer github-access-token") {
      return HttpResponse.json({ message: "Bad credentials" }, { status: 401 });
    }
    if (mock.github.emailsStatus !== 200) return HttpResponse.json({}, { status: mock.github.emailsStatus });
    return HttpResponse.json(mock.github.emails);
  }),
);

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------
type Provider = "google" | "github";
type Jar = Record<string, string>;

const testDb = useTestDatabase();
let app: FastifyInstance;
let env: ApiEnv;

async function buildTestApp(overrides: Record<string, string | undefined> = {}): Promise<FastifyInstance> {
  const built = await buildApp({
    env: loadApiEnv({ ...BASE_ENV, ...overrides }),
    db: testDb.db,
    mailer: new TestMailer(),
    logger: false,
  });
  await built.ready();
  return built;
}

/** Cookies set (non-empty) by a response, as a name → value map. */
function jarFrom(response: LightMyRequestResponse): Jar {
  const jar: Jar = {};
  for (const cookie of response.cookies) {
    if (cookie.value) jar[cookie.name] = cookie.value;
  }
  return jar;
}

function location(response: LightMyRequestResponse): URL {
  expect(response.statusCode).toBe(302);
  const header = response.headers.location;
  expect(typeof header).toBe("string");
  return new URL(String(header));
}

function s256(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

interface StartedFlow {
  response: LightMyRequestResponse;
  authorizeUrl: URL;
  state: string;
  stateCookie: string;
}

async function startFlow(provider: Provider, returnTo?: string, instance: FastifyInstance = app): Promise<StartedFlow> {
  const query = returnTo === undefined ? "" : `?returnTo=${encodeURIComponent(returnTo)}`;
  const response = await instance.inject({ method: "GET", url: `/api/v1/auth/oauth/${provider}/start${query}` });
  const authorizeUrl = location(response);
  return {
    response,
    authorizeUrl,
    state: authorizeUrl.searchParams.get("state") ?? "",
    stateCookie: jarFrom(response)[OAUTH_STATE_COOKIE_NAME] ?? "",
  };
}

async function callback(
  provider: Provider,
  params: { code?: string | undefined; state?: string | undefined; error?: string | undefined },
  cookies: Jar,
  instance: FastifyInstance = app,
): Promise<LightMyRequestResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, value);
  return instance.inject({
    method: "GET",
    url: `/api/v1/auth/oauth/${provider}/callback?${query.toString()}`,
    cookies,
  });
}

/** Runs a full, well-formed start → callback round trip. */
async function signInWith(provider: Provider, returnTo?: string, extraCookies: Jar = {}) {
  const flow = await startFlow(provider, returnTo);
  const response = await callback(
    provider,
    { code: "mock-auth-code", state: flow.state },
    { [OAUTH_STATE_COOKIE_NAME]: flow.stateCookie, ...extraCookies },
  );
  return { flow, response };
}

function expectErrorRedirect(response: LightMyRequestResponse, code: string, provider?: Provider): void {
  const target = location(response);
  expect(target.origin).toBe(ORIGIN);
  expect(target.pathname).toBe("/oauth/error");
  expect(target.searchParams.get("code")).toBe(code);
  if (provider) expect(target.searchParams.get("provider")).toBe(provider);
  // Nothing sensitive travels in the URL.
  expect(response.headers.location).not.toContain("@");
  expect(response.headers.location).not.toMatch(/token|secret/i);
  const jar = jarFrom(response);
  expect(jar.tp_access).toBeUndefined();
  expect(jar.tp_refresh).toBeUndefined();
}

async function createLocalUser(email: string, options: { verified?: boolean } = {}) {
  const { verified = true } = options;
  await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password: PASSWORD, name: "Local User" },
  });
  if (verified) await testDb.db.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });
  return testDb.db.user.findUniqueOrThrow({ where: { email } });
}

async function loginJar(email: string): Promise<Jar> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  return jarFrom(response);
}

async function counts() {
  return {
    users: await testDb.db.user.count(),
    accounts: await testDb.db.oAuthAccount.count(),
    sessions: await testDb.db.session.count(),
  };
}

// ---------------------------------------------------------------------------------------------
beforeAll(async () => {
  server.listen({ onUnhandledRequest: "error" });
  env = loadApiEnv(BASE_ENV);
  app = await buildTestApp();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(async () => {
  server.close();
  await app.close();
});

beforeEach(async () => {
  mock = freshMock();
  await truncateAll(testDb.db);
});

describe("OAuth start", () => {
  it.each([
    ["google", "https://accounts.google.com/o/oauth2/v2/auth", "openid email profile"],
    ["github", "https://github.com/login/oauth/authorize", "read:user user:email"],
  ] as const)(
    "[SC-AUTH-013] %s start redirects to the provider with state, PKCE S256 and a sealed cookie",
    async (provider, endpoint, scope) => {
      const { response, authorizeUrl, state, stateCookie } = await startFlow(provider);

      expect(`${authorizeUrl.origin}${authorizeUrl.pathname}`).toBe(endpoint);
      expect(authorizeUrl.searchParams.get("response_type")).toBe("code");
      expect(authorizeUrl.searchParams.get("client_id")).toBe(`${provider}-client-id`);
      expect(authorizeUrl.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/v1/auth/oauth/${provider}/callback`);
      expect(authorizeUrl.searchParams.get("code_challenge_method")).toBe("S256");
      expect(authorizeUrl.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(authorizeUrl.searchParams.get("scope")).toBe(scope);
      expect(state.length).toBeGreaterThanOrEqual(16);

      const cookie = response.cookies.find((c) => c.name === OAUTH_STATE_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.secure).toBe(true);
      expect(cookie?.sameSite?.toLowerCase()).toBe("lax");
      expect(cookie?.path).toBe("/api/v1/auth/oauth");
      expect(cookie?.maxAge).toBe(OAUTH_STATE_TTL_SECONDS);
      // The verifier lives only in the sealed cookie, never in the authorize URL.
      expect(authorizeUrl.toString()).not.toContain("code_verifier");
      expect(stateCookie).not.toBe("");
    },
  );

  it("[SC-AUTH-022] an unknown provider is a 404", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/auth/oauth/gitlab/start" });
    expect(response.statusCode).toBe(404);
    expect(ApiFailureSchema.parse(response.json()).error.code).toBe("NOT_FOUND");
  });

  it("[SC-AUTH-022] a provider without credentials redirects to the friendly error page", async () => {
    const unconfigured = await buildTestApp({ GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: undefined });
    try {
      const response = await unconfigured.inject({ method: "GET", url: "/api/v1/auth/oauth/github/start" });
      expectErrorRedirect(response, "PROVIDER_NOT_CONFIGURED", "github");
      expect(jarFrom(response)[OAUTH_STATE_COOKIE_NAME]).toBeUndefined();
      // Google stays available.
      const google = await unconfigured.inject({ method: "GET", url: "/api/v1/auth/oauth/google/start" });
      expect(location(google).hostname).toBe("accounts.google.com");
    } finally {
      await unconfigured.close();
    }
  });
});

describe("OAuth sign-in: new and returning users", () => {
  it("[SC-AUTH-013] Google: a first-time sign-in creates a verified user and a session (no tokens in the URL)", async () => {
    const { flow, response } = await signInWith("google");

    const target = location(response);
    expect(target.origin).toBe(ORIGIN);
    expect(`${target.pathname}${target.search}`).toBe("/runs");
    expect(response.headers.location).not.toMatch(/token|code=|state=/i);
    expect(response.body).toBe("");

    const user = await testDb.db.user.findUniqueOrThrow({ where: { email: "oauth.google@example.com" } });
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.passwordHash).toBeNull();
    expect(user.name).toBe("Gina Google");
    expect(user.avatarUrl).toContain("googleusercontent");
    const accounts = await testDb.db.oAuthAccount.findMany({ where: { userId: user.id } });
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ provider: "GOOGLE", providerAccountId: "g-1001" });

    // Same session cookies as password login.
    const access = response.cookies.find((c) => c.name === "tp_access");
    const refresh = response.cookies.find((c) => c.name === "tp_refresh");
    expect(access).toMatchObject({ httpOnly: true, secure: true, path: "/" });
    expect(refresh).toMatchObject({ httpOnly: true, secure: true, path: "/api/v1/auth" });
    expect(access?.sameSite?.toLowerCase()).toBe("lax");

    // The state cookie is cleared once consumed.
    const cleared = response.cookies.find((c) => c.name === OAUTH_STATE_COOKIE_NAME);
    expect(cleared?.value).toBe("");

    // The session works.
    const me = await app.inject({ method: "GET", url: "/api/v1/auth/me", cookies: jarFrom(response) });
    expect(me.statusCode).toBe(200);
    expect(apiSuccess(AuthMeResponseSchema).parse(me.json()).data.user.email).toBe("oauth.google@example.com");

    // PKCE binding: the token request carries the verifier whose S256 challenge was on the authorize URL.
    expect(mock.tokenCalls).toHaveLength(1);
    const call = mock.tokenCalls[0];
    expect(call?.body.get("grant_type")).toBe("authorization_code");
    expect(call?.body.get("code")).toBe("mock-auth-code");
    expect(call?.body.get("redirect_uri")).toBe(`${ORIGIN}/api/v1/auth/oauth/google/callback`);
    const verifier = call?.body.get("code_verifier") ?? "";
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(s256(verifier)).toBe(flow.authorizeUrl.searchParams.get("code_challenge"));
    // The client secret is sent as Basic credentials, never in the body.
    expect(call?.body.get("client_secret")).toBeNull();
    expect(call?.authorization).toMatch(/^Basic /);
  });

  it("[SC-AUTH-013] GitHub: uses the verified primary address from /user/emails, never the profile email", async () => {
    const { flow, response } = await signInWith("github");

    expect(`${location(response).origin}${location(response).pathname}`).toBe(`${ORIGIN}/runs`);
    const users = await testDb.db.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ email: "oauth.github@example.com", name: "Hubert Hub" });
    expect(users[0]?.emailVerifiedAt).not.toBeNull();
    const call = mock.tokenCalls[0];
    expect(s256(call?.body.get("code_verifier") ?? "")).toBe(flow.authorizeUrl.searchParams.get("code_challenge"));
    const account = await testDb.db.oAuthAccount.findFirstOrThrow();
    expect(account).toMatchObject({ provider: "GITHUB", providerAccountId: "2002" });
  });

  it("[SC-AUTH-013] a returning user signs in to the same account (no duplicate user or link)", async () => {
    const first = await signInWith("google");
    const second = await signInWith("google");

    expect(location(first.response).pathname).toBe("/runs");
    expect(location(second.response).pathname).toBe("/runs");
    expect(await counts()).toMatchObject({ users: 1, accounts: 1, sessions: 2 });
    // Different session families.
    const sessions = await testDb.db.session.findMany();
    expect(new Set(sessions.map((s) => s.familyId)).size).toBe(2);
  });

  it("[SC-AUTH-013] a returning user is matched by provider account id even if the provider email changed", async () => {
    await signInWith("google");
    mock.google.email = "renamed.google@example.com";
    const { response } = await signInWith("google");

    expect(location(response).pathname).toBe("/runs");
    expect(await counts()).toMatchObject({ users: 1, accounts: 1 });
    const user = await testDb.db.user.findFirstOrThrow();
    expect(user.email).toBe("oauth.google@example.com");
  });

  it("[SC-AUTH-013] two concurrent first-time callbacks resolve to a single user", async () => {
    const flowA = await startFlow("github");
    const flowB = await startFlow("github");
    const [a, b] = await Promise.all([
      callback("github", { code: "code-a", state: flowA.state }, { [OAUTH_STATE_COOKIE_NAME]: flowA.stateCookie }),
      callback("github", { code: "code-b", state: flowB.state }, { [OAUTH_STATE_COOKIE_NAME]: flowB.stateCookie }),
    ]);

    expect(location(a).pathname).toBe("/runs");
    expect(location(b).pathname).toBe("/runs");
    expect(await counts()).toMatchObject({ users: 1, accounts: 1, sessions: 2 });
  });

  it("[SC-AUTH-013] mixed-case provider emails are normalized", async () => {
    mock.google.email = "Mixed.Case@Example.COM";
    await signInWith("google");
    expect((await testDb.db.user.findFirstOrThrow()).email).toBe("mixed.case@example.com");
  });
});

describe("OAuth callback: forged or malformed requests", () => {
  async function expectRejected(response: LightMyRequestResponse, provider: Provider): Promise<void> {
    expectErrorRedirect(response, "INVALID_STATE", provider);
    expect(mock.tokenCalls).toHaveLength(0);
    expect(await counts()).toEqual({ users: 0, accounts: 0, sessions: 0 });
  }

  it("[SC-AUTH-014] a state that differs from the cookie is rejected", async () => {
    const flow = await startFlow("google");
    const response = await callback(
      "google",
      { code: "mock-auth-code", state: "forged-state-value-0123456789abcdef" },
      { [OAUTH_STATE_COOKIE_NAME]: flow.stateCookie },
    );
    await expectRejected(response, "google");
  });

  it("[SC-AUTH-014] a callback without the state cookie is rejected", async () => {
    const flow = await startFlow("google");
    const response = await callback("google", { code: "mock-auth-code", state: flow.state }, {});
    await expectRejected(response, "google");
  });

  it("[SC-AUTH-014] a callback without a state parameter is rejected", async () => {
    const flow = await startFlow("google");
    const response = await callback(
      "google",
      { code: "mock-auth-code" },
      { [OAUTH_STATE_COOKIE_NAME]: flow.stateCookie },
    );
    await expectRejected(response, "google");
  });

  it("[SC-AUTH-014] a state cookie with a tampered signature is rejected", async () => {
    const flow = await startFlow("google");
    const tampered = `${flow.stateCookie.slice(0, -3)}AAA`;
    const response = await callback(
      "google",
      { code: "mock-auth-code", state: flow.state },
      { [OAUTH_STATE_COOKIE_NAME]: tampered },
    );
    await expectRejected(response, "google");
  });

  it("[SC-AUTH-014] a state cookie forged with another secret is rejected", async () => {
    const flow = await startFlow("github");
    const forged = createStateCodec("attacker-secret-at-least-32-characters!!").seal({
      s: flow.state,
      v: "v".repeat(64),
      p: "github",
      r: "/runs",
    });
    const response = await callback(
      "github",
      { code: "mock-auth-code", state: flow.state },
      { [OAUTH_STATE_COOKIE_NAME]: forged },
    );
    await expectRejected(response, "github");
  });

  it("[SC-AUTH-014] an expired state cookie is rejected", async () => {
    const state = "expired-state-value-0123456789abcdef";
    const expired = createStateCodec(env.JWT_ACCESS_SECRET).seal(
      { s: state, v: "v".repeat(64), p: "google", r: "/runs" },
      Date.now() - (OAUTH_STATE_TTL_SECONDS + 30) * 1000,
    );
    const response = await callback(
      "google",
      { code: "mock-auth-code", state },
      { [OAUTH_STATE_COOKIE_NAME]: expired },
    );
    await expectRejected(response, "google");
  });

  it("[SC-AUTH-014] a cookie issued for the other provider is rejected", async () => {
    const flow = await startFlow("google");
    const response = await callback(
      "github",
      { code: "mock-auth-code", state: flow.state },
      { [OAUTH_STATE_COOKIE_NAME]: flow.stateCookie },
    );
    await expectRejected(response, "github");
  });

  it("[SC-AUTH-014] a callback without a code is rejected", async () => {
    const flow = await startFlow("google");
    const response = await callback("google", { state: flow.state }, { [OAUTH_STATE_COOKIE_NAME]: flow.stateCookie });
    await expectRejected(response, "google");
  });

  it("[SC-AUTH-014] a forged provider error without a valid state cannot steer the user-facing message", async () => {
    const response = await callback(
      "google",
      { error: "access_denied", state: "forged-state-value-0123456789abcdef" },
      {},
    );
    await expectRejected(response, "google");
  });

  it("[SC-AUTH-014] the state cookie is cleared even when the callback fails", async () => {
    const flow = await startFlow("google");
    const response = await callback(
      "google",
      { code: "c", state: "forged-state-value-0123456789abcdef" },
      { [OAUTH_STATE_COOKIE_NAME]: flow.stateCookie },
    );
    expect(response.cookies.find((c) => c.name === OAUTH_STATE_COOKIE_NAME)?.value).toBe("");
  });
});

describe("OAuth account linking by email", () => {
  it("[SC-AUTH-015] links to an existing local account when both emails are verified", async () => {
    const local = await createLocalUser("oauth.google@example.com", { verified: true });

    const { response } = await signInWith("google");

    expect(location(response).pathname).toBe("/runs");
    expect(jarFrom(response).tp_access).toBeDefined();
    expect(await counts()).toMatchObject({ users: 1, accounts: 1 });
    const account = await testDb.db.oAuthAccount.findFirstOrThrow();
    expect(account.userId).toBe(local.id);
    // The local account is untouched: password login still works.
    const stillLogsIn = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "oauth.google@example.com", password: PASSWORD },
    });
    expect(stillLogsIn.statusCode).toBe(200);
  });

  it("[SC-AUTH-016] refuses to link when the local email is unverified (pre-hijacking guard)", async () => {
    const local = await createLocalUser("oauth.google@example.com", { verified: false });

    const { response } = await signInWith("google");

    expectErrorRedirect(response, "EMAIL_CONFLICT", "google");
    expect(await counts()).toEqual({ users: 1, accounts: 0, sessions: 0 });
    const unchanged = await testDb.db.user.findUniqueOrThrow({ where: { id: local.id } });
    expect(unchanged.emailVerifiedAt).toBeNull();
    expect(unchanged.passwordHash).toBe(local.passwordHash);
  });

  it("[SC-AUTH-016] refuses to sign in when Google says the email is unverified", async () => {
    await createLocalUser("oauth.google@example.com", { verified: true });
    mock.google.emailVerified = false;

    const { response } = await signInWith("google");

    expectErrorRedirect(response, "EMAIL_UNVERIFIED", "google");
    expect(await counts()).toEqual({ users: 1, accounts: 0, sessions: 0 });
  });

  it("[SC-AUTH-016] refuses to create an account from an unverified provider email", async () => {
    mock.google.emailVerified = false;
    const { response } = await signInWith("google");
    expectErrorRedirect(response, "EMAIL_UNVERIFIED", "google");
    expect(await counts()).toEqual({ users: 0, accounts: 0, sessions: 0 });
  });

  it("[SC-AUTH-016] refuses a Google profile with no email at all", async () => {
    mock.google.email = undefined;
    const { response } = await signInWith("google");
    expectErrorRedirect(response, "EMAIL_UNVERIFIED", "google");
    expect(await counts()).toEqual({ users: 0, accounts: 0, sessions: 0 });
  });

  it("[SC-AUTH-016] refuses GitHub accounts whose primary address is unverified", async () => {
    await createLocalUser("primary.unverified@example.com", { verified: true });
    mock.github.emails = [
      { email: "primary.unverified@example.com", primary: true, verified: false },
      { email: "second@example.com", primary: false, verified: true },
    ];

    const { response } = await signInWith("github");

    expectErrorRedirect(response, "EMAIL_UNVERIFIED", "github");
    expect(await counts()).toEqual({ users: 1, accounts: 0, sessions: 0 });
  });

  it("[SC-AUTH-016] ignores the public profile email when GitHub lists no emails", async () => {
    await createLocalUser("public.decoy@example.com", { verified: true });
    mock.github.emails = [];

    const { response } = await signInWith("github");

    expectErrorRedirect(response, "EMAIL_UNVERIFIED", "github");
    expect(await counts()).toEqual({ users: 1, accounts: 0, sessions: 0 });
  });

  it("[SC-AUTH-016] a soft-deleted local account is never signed in or re-linked", async () => {
    await createLocalUser("oauth.google@example.com", { verified: true });
    await testDb.db.user.update({ where: { email: "oauth.google@example.com" }, data: { deletedAt: new Date() } });

    const { response } = await signInWith("google");

    expectErrorRedirect(response, "ACCOUNT_DISABLED", "google");
    expect(await counts()).toEqual({ users: 1, accounts: 0, sessions: 0 });
  });

  it("[SC-AUTH-016] a linked account whose user was deleted cannot sign in", async () => {
    await signInWith("google");
    await testDb.db.user.updateMany({ data: { deletedAt: new Date() } });

    const { response } = await signInWith("google");

    expectErrorRedirect(response, "ACCOUNT_DISABLED", "google");
  });
});

describe("OAuth returnTo allow-list", () => {
  it.each([
    ["/runs", "/runs"],
    ["/runs?status=failed", "/runs?status=failed"],
    ["/settings/profile", "/settings/profile"],
  ])("[SC-AUTH-021] honors the allow-listed returnTo %s", async (input, expected) => {
    const { response } = await signInWith("google", input);
    const target = location(response);
    expect(target.origin).toBe(ORIGIN);
    expect(`${target.pathname}${target.search}`).toBe(expected);
  });

  it.each([
    "//evil.example",
    "https://evil.example/runs",
    "/\\evil.example",
    "/runs@evil.example",
    "/%2f%2fevil.example",
    "javascript:alert(1)",
    "/unknown",
    "/api/v1/auth/logout-all",
  ])("[SC-AUTH-021] a hostile returnTo %j falls back to /runs on this origin", async (input) => {
    const { response } = await signInWith("google", input);
    const target = location(response);
    expect(target.origin).toBe(ORIGIN);
    expect(`${target.pathname}${target.search}`).toBe("/runs");
  });
});

describe("OAuth provider failures", () => {
  it("[SC-AUTH-022] the user denying consent ends on ACCESS_DENIED without a session", async () => {
    const flow = await startFlow("github");
    const response = await callback(
      "github",
      { error: "access_denied", state: flow.state },
      { [OAUTH_STATE_COOKIE_NAME]: flow.stateCookie },
    );
    expectErrorRedirect(response, "ACCESS_DENIED", "github");
    expect(mock.tokenCalls).toHaveLength(0);
    expect(await counts()).toEqual({ users: 0, accounts: 0, sessions: 0 });
  });

  it("[SC-AUTH-022] any other provider-reported error ends on PROVIDER_ERROR, without echoing it", async () => {
    const flow = await startFlow("google");
    const response = await callback(
      "google",
      { error: "<script>alert(1)</script>", state: flow.state },
      { [OAUTH_STATE_COOKIE_NAME]: flow.stateCookie },
    );
    expectErrorRedirect(response, "PROVIDER_ERROR", "google");
    expect(response.headers.location).not.toContain("script");
  });

  it.each([
    ["google", 400],
    ["google", 500],
    ["github", 400],
    ["github", 500],
  ] as const)("[SC-AUTH-022] %s token endpoint failing with %i ends on PROVIDER_ERROR", async (provider, status) => {
    mock[provider].tokenStatus = status;
    const { response } = await signInWith(provider);
    expectErrorRedirect(response, "PROVIDER_ERROR", provider);
    expect(await counts()).toEqual({ users: 0, accounts: 0, sessions: 0 });
  });

  it("[SC-AUTH-022] a provider that never answers ends on PROVIDER_ERROR within the configured timeout", async () => {
    const impatient = await buildTestApp({ OAUTH_PROVIDER_TIMEOUT_MS: "300" });
    try {
      server.use(
        http.post("https://oauth2.googleapis.com/token", async () => {
          await delay("infinite");
          return HttpResponse.json({});
        }),
      );
      const flow = await startFlow("google", undefined, impatient);
      const startedAt = Date.now();
      const response = await callback(
        "google",
        { code: "mock-auth-code", state: flow.state },
        { [OAUTH_STATE_COOKIE_NAME]: flow.stateCookie },
        impatient,
      );
      expectErrorRedirect(response, "PROVIDER_ERROR", "google");
      expect(Date.now() - startedAt).toBeLessThan(5_000);

      server.use(
        http.get("https://openidconnect.googleapis.com/v1/userinfo", async () => {
          await delay("infinite");
          return HttpResponse.json({});
        }),
        http.post("https://oauth2.googleapis.com/token", () =>
          HttpResponse.json({ access_token: "google-access-token", token_type: "Bearer", expires_in: 3600 }),
        ),
      );
      const second = await startFlow("google", undefined, impatient);
      const slowProfile = await callback(
        "google",
        { code: "mock-auth-code", state: second.state },
        { [OAUTH_STATE_COOKIE_NAME]: second.stateCookie },
        impatient,
      );
      expectErrorRedirect(slowProfile, "PROVIDER_ERROR", "google");
      expect(await counts()).toEqual({ users: 0, accounts: 0, sessions: 0 });
    } finally {
      await impatient.close();
    }
  });

  it("[SC-AUTH-022] the Google profile endpoint failing ends on PROVIDER_ERROR", async () => {
    mock.google.userinfoStatus = 503;
    const { response } = await signInWith("google");
    expectErrorRedirect(response, "PROVIDER_ERROR", "google");
  });

  it("[SC-AUTH-022] the GitHub emails endpoint failing ends on PROVIDER_ERROR (no fallback to the profile email)", async () => {
    mock.github.emailsStatus = 500;
    const { response } = await signInWith("github");
    expectErrorRedirect(response, "PROVIDER_ERROR", "github");
    expect(await counts()).toEqual({ users: 0, accounts: 0, sessions: 0 });
  });

  it("[SC-AUTH-022] a malformed provider profile ends on PROVIDER_ERROR", async () => {
    server.use(
      http.get("https://openidconnect.googleapis.com/v1/userinfo", () => HttpResponse.json({ unexpected: true })),
    );
    const { response } = await signInWith("google");
    expectErrorRedirect(response, "PROVIDER_ERROR", "google");
  });
});

describe("OAuth explicit linking from settings", () => {
  async function startLink(jar: Jar, provider: Provider, origin: string = ORIGIN) {
    return app.inject({
      method: "POST",
      url: `/api/v1/me/oauth-accounts/${provider}/link`,
      headers: { origin },
      cookies: jar,
    });
  }

  it("[SC-AUTH-023] links a provider account to the signed-in user, whatever its email", async () => {
    const local = await createLocalUser("local@example.com", { verified: true });
    const jar = await loginJar("local@example.com");

    const started = await startLink(jar, "github");
    expect(started.statusCode).toBe(200);
    const { authorizationUrl } = started.json<{ data: { authorizationUrl: string } }>().data;
    const authorize = new URL(authorizationUrl);
    expect(authorize.hostname).toBe("github.com");
    const stateCookie = jarFrom(started)[OAUTH_STATE_COOKIE_NAME] ?? "";
    expect(stateCookie).not.toBe("");

    const response = await callback(
      "github",
      { code: "mock-auth-code", state: authorize.searchParams.get("state") ?? "" },
      { [OAUTH_STATE_COOKIE_NAME]: stateCookie, tp_access: jar.tp_access ?? "" },
    );

    const target = location(response);
    expect(`${target.origin}${target.pathname}${target.search}`).toBe(`${ORIGIN}/settings/profile?linked=github`);
    // No new session and no new user: the signed-in user simply gained a login method.
    expect(jarFrom(response).tp_access).toBeUndefined();
    const account = await testDb.db.oAuthAccount.findFirstOrThrow();
    expect(account).toMatchObject({ userId: local.id, provider: "GITHUB", providerAccountId: "2002" });
    expect(await testDb.db.user.count()).toBe(1);
  });

  it("[SC-AUTH-023] linking the same provider account again is idempotent", async () => {
    await createLocalUser("local@example.com", { verified: true });
    const jar = await loginJar("local@example.com");
    for (let i = 0; i < 2; i++) {
      const started = await startLink(jar, "google");
      const state =
        new URL(started.json<{ data: { authorizationUrl: string } }>().data.authorizationUrl).searchParams.get(
          "state",
        ) ?? "";
      const response = await callback(
        "google",
        { code: "mock-auth-code", state },
        { [OAUTH_STATE_COOKIE_NAME]: jarFrom(started)[OAUTH_STATE_COOKIE_NAME] ?? "", tp_access: jar.tp_access ?? "" },
      );
      expect(location(response).searchParams.get("linked")).toBe("google");
    }
    expect(await testDb.db.oAuthAccount.count()).toBe(1);
  });

  it("[SC-AUTH-023] refuses a provider account that already belongs to another user", async () => {
    await signInWith("google"); // creates user A owning g-1001
    await createLocalUser("local@example.com", { verified: true });
    const jar = await loginJar("local@example.com");

    const started = await startLink(jar, "google");
    const state =
      new URL(started.json<{ data: { authorizationUrl: string } }>().data.authorizationUrl).searchParams.get("state") ??
      "";
    const response = await callback(
      "google",
      { code: "mock-auth-code", state },
      { [OAUTH_STATE_COOKIE_NAME]: jarFrom(started)[OAUTH_STATE_COOKIE_NAME] ?? "", tp_access: jar.tp_access ?? "" },
    );

    expect(location(response).searchParams.get("code")).toBe("ACCOUNT_ALREADY_LINKED");
    expect(await testDb.db.oAuthAccount.count()).toBe(1);
  });

  it("[SC-AUTH-023] refuses when the user already linked a different account of the same provider", async () => {
    await createLocalUser("local@example.com", { verified: true });
    const jar = await loginJar("local@example.com");
    const local = await testDb.db.user.findUniqueOrThrow({ where: { email: "local@example.com" } });
    await testDb.db.oAuthAccount.create({ data: { userId: local.id, provider: "GITHUB", providerAccountId: "999" } });

    const started = await startLink(jar, "github");
    const state =
      new URL(started.json<{ data: { authorizationUrl: string } }>().data.authorizationUrl).searchParams.get("state") ??
      "";
    const response = await callback(
      "github",
      { code: "mock-auth-code", state },
      { [OAUTH_STATE_COOKIE_NAME]: jarFrom(started)[OAUTH_STATE_COOKIE_NAME] ?? "", tp_access: jar.tp_access ?? "" },
    );

    expect(location(response).searchParams.get("code")).toBe("ACCOUNT_ALREADY_LINKED");
    expect(await testDb.db.oAuthAccount.count()).toBe(1);
  });

  it("[SC-AUTH-023] a link flow completed without the initiating session is rejected", async () => {
    await createLocalUser("local@example.com", { verified: true });
    await createLocalUser("other@example.com", { verified: true });
    const jar = await loginJar("local@example.com");
    const otherJar = await loginJar("other@example.com");

    const started = await startLink(jar, "github");
    const state =
      new URL(started.json<{ data: { authorizationUrl: string } }>().data.authorizationUrl).searchParams.get("state") ??
      "";
    const stateCookie = jarFrom(started)[OAUTH_STATE_COOKIE_NAME] ?? "";

    const attempts: Jar[] = [
      { [OAUTH_STATE_COOKIE_NAME]: stateCookie },
      { [OAUTH_STATE_COOKIE_NAME]: stateCookie, tp_access: otherJar.tp_access ?? "" },
    ];
    for (const cookies of attempts) {
      const response = await callback("github", { code: "mock-auth-code", state }, cookies);
      expect(location(response).searchParams.get("code")).toBe("INVALID_STATE");
    }
    expect(mock.tokenCalls).toHaveLength(0);
    expect(await testDb.db.oAuthAccount.count()).toBe(0);
  });

  it("[SC-AUTH-023] a link flow is rejected once the initiating session was revoked", async () => {
    await createLocalUser("local@example.com", { verified: true });
    const jar = await loginJar("local@example.com");
    const started = await startLink(jar, "github");
    const state =
      new URL(started.json<{ data: { authorizationUrl: string } }>().data.authorizationUrl).searchParams.get("state") ??
      "";
    await testDb.db.session.updateMany({ data: { revokedAt: new Date() } });

    const response = await callback(
      "github",
      { code: "mock-auth-code", state },
      { [OAUTH_STATE_COOKIE_NAME]: jarFrom(started)[OAUTH_STATE_COOKIE_NAME] ?? "", tp_access: jar.tp_access ?? "" },
    );

    expect(location(response).searchParams.get("code")).toBe("INVALID_STATE");
    expect(await testDb.db.oAuthAccount.count()).toBe(0);
  });

  it("[SC-AUTH-023] starting a link requires authentication and a same-origin request", async () => {
    await createLocalUser("local@example.com", { verified: true });
    const jar = await loginJar("local@example.com");

    const anonymous = await app.inject({ method: "POST", url: "/api/v1/me/oauth-accounts/github/link" });
    expect(anonymous.statusCode).toBe(401);

    const foreign = await startLink(jar, "github", "https://evil.example");
    expect(foreign.statusCode).toBe(403);
    expect(jarFrom(foreign)[OAUTH_STATE_COOKIE_NAME]).toBeUndefined();

    const unknownProvider = await app.inject({
      method: "POST",
      url: "/api/v1/me/oauth-accounts/gitlab/link",
      headers: { origin: ORIGIN },
      cookies: jar,
    });
    expect(unknownProvider.statusCode).toBe(404);

    const unconfigured = await buildTestApp({ GITHUB_CLIENT_SECRET: undefined });
    try {
      const notAvailable = await unconfigured.inject({
        method: "POST",
        url: "/api/v1/me/oauth-accounts/github/link",
        headers: { origin: ORIGIN },
        cookies: jar,
      });
      expect(notAvailable.statusCode).toBe(503);
      expect(jarFrom(notAvailable)[OAUTH_STATE_COOKIE_NAME]).toBeUndefined();
    } finally {
      await unconfigured.close();
    }
  });

  it("[SC-AUTH-019] an unverified user cannot start an account link", async () => {
    await createLocalUser("unverified@example.com", { verified: false });
    const jar = await loginJar("unverified@example.com");

    const response = await startLink(jar, "github");

    expect(response.statusCode).toBe(403);
    expect(ApiFailureSchema.parse(response.json()).error.code).toBe("EMAIL_NOT_VERIFIED");
    expect(jarFrom(response)[OAUTH_STATE_COOKIE_NAME]).toBeUndefined();
  });
});

describe("OAuth linked accounts: list and unlink", () => {
  async function createGithubLink(userId: string, providerAccountId = "2002") {
    return testDb.db.oAuthAccount.create({ data: { userId, provider: "GITHUB", providerAccountId } });
  }

  function listAccounts(jar: Jar) {
    return app.inject({ method: "GET", url: "/api/v1/me/oauth-accounts", cookies: jar });
  }

  function unlink(jar: Jar, id: string) {
    return app.inject({
      method: "DELETE",
      url: `/api/v1/me/oauth-accounts/${id}`,
      headers: { origin: ORIGIN },
      cookies: jar,
    });
  }

  it("[SC-AUTH-024] lists only the caller's accounts, without provider account ids", async () => {
    const mine = await createLocalUser("mine@example.com");
    const theirs = await createLocalUser("theirs@example.com");
    await createGithubLink(mine.id, "mine-1");
    await testDb.db.oAuthAccount.create({
      data: { userId: theirs.id, provider: "GOOGLE", providerAccountId: "theirs-1" },
    });
    const jar = await loginJar("mine@example.com");

    const response = await listAccounts(jar);

    expect(response.statusCode).toBe(200);
    const body = apiSuccess(ListOAuthAccountsResponseSchema).parse(response.json());
    expect(body.data.hasPassword).toBe(true);
    expect(body.data.accounts).toHaveLength(1);
    expect(body.data.accounts[0]?.provider).toBe("github");
    expect(response.body).not.toContain("mine-1");
    expect(response.body).not.toContain("theirs-1");
  });

  it("[SC-AUTH-024] listing and unlinking require authentication", async () => {
    const anonymousList = await app.inject({ method: "GET", url: "/api/v1/me/oauth-accounts" });
    expect(anonymousList.statusCode).toBe(401);
    const anonymousDelete = await app.inject({ method: "DELETE", url: "/api/v1/me/oauth-accounts/whatever" });
    expect(anonymousDelete.statusCode).toBe(401);
  });

  it("[SC-AUTH-024] unlinks an account when the user keeps a password", async () => {
    const user = await createLocalUser("mine@example.com");
    const account = await createGithubLink(user.id);
    const jar = await loginJar("mine@example.com");

    const response = await unlink(jar, account.id);

    expect(response.statusCode).toBe(200);
    expect(await testDb.db.oAuthAccount.count()).toBe(0);
  });

  it("[SC-AUTH-024] unlinking needs a same-origin request (CSRF)", async () => {
    const user = await createLocalUser("mine@example.com");
    const account = await createGithubLink(user.id);
    const jar = await loginJar("mine@example.com");

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/me/oauth-accounts/${account.id}`,
      headers: { origin: "https://evil.example" },
      cookies: jar,
    });

    expect(response.statusCode).toBe(403);
    expect(await testDb.db.oAuthAccount.count()).toBe(1);
  });

  it("[SC-AUTH-024] refuses to remove the last sign-in method of an OAuth-only user", async () => {
    const { response: signedIn } = await signInWith("google");
    const jar = jarFrom(signedIn);
    const listed = apiSuccess(ListOAuthAccountsResponseSchema).parse((await listAccounts(jar)).json());
    expect(listed.data.hasPassword).toBe(false);
    const only = listed.data.accounts[0];
    expect(only).toBeDefined();

    const response = await unlink(jar, only?.id ?? "");

    expect(response.statusCode).toBe(409);
    expect(ApiFailureSchema.parse(response.json()).error.code).toBe("CONFLICT");
    expect(await testDb.db.oAuthAccount.count()).toBe(1);
  });

  it("[SC-AUTH-024] allows unlinking one of two accounts for an OAuth-only user, then protects the last", async () => {
    const { response: signedIn } = await signInWith("google");
    const jar = jarFrom(signedIn);
    const user = await testDb.db.user.findFirstOrThrow();
    const github = await createGithubLink(user.id);

    expect((await unlink(jar, github.id)).statusCode).toBe(200);
    const remaining = await testDb.db.oAuthAccount.findFirstOrThrow();
    expect((await unlink(jar, remaining.id)).statusCode).toBe(409);
    expect(await testDb.db.oAuthAccount.count()).toBe(1);
  });

  it("[SC-AUTH-024] another user's linked account is a 404 and stays linked", async () => {
    await createLocalUser("mine@example.com");
    const theirs = await createLocalUser("theirs@example.com");
    const theirAccount = await createGithubLink(theirs.id);
    const jar = await loginJar("mine@example.com");

    const response = await unlink(jar, theirAccount.id);

    expect(response.statusCode).toBe(404);
    expect(await testDb.db.oAuthAccount.count()).toBe(1);
    const missing = await unlink(jar, "does-not-exist");
    expect(missing.statusCode).toBe(404);
  });
});

describe("OAuth rate limiting", () => {
  it("[SC-AUTH-025] returns 429 once one IP exceeds the per-minute limit", async () => {
    const limited = await buildTestApp({ OAUTH_RATE_LIMIT_PER_MINUTE: "3" });
    try {
      for (let i = 0; i < 3; i++) {
        const ok = await limited.inject({ method: "GET", url: "/api/v1/auth/oauth/google/start" });
        expect(ok.statusCode).toBe(302);
      }
      const blocked = await limited.inject({ method: "GET", url: "/api/v1/auth/oauth/google/start" });
      expect(blocked.statusCode).toBe(429);
      expect(ApiFailureSchema.parse(blocked.json()).error.code).toBe("RATE_LIMITED");

      // The callback shares the limit.
      const callbackBlocked = await limited.inject({
        method: "GET",
        url: "/api/v1/auth/oauth/google/callback?code=x&state=y",
      });
      expect(callbackBlocked.statusCode).toBe(429);

      // Other routes are unaffected.
      const health = await limited.inject({ method: "GET", url: "/api/v1/auth/me" });
      expect(health.statusCode).toBe(401);
    } finally {
      await limited.close();
    }
  });
});
