import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { expect, test } from "@playwright/test";

const require = createRequire(import.meta.url);

function listen(server: ReturnType<typeof createServer>) {
  server.listen(0, "127.0.0.1");
  return once(server, "listening");
}

function portOf(server: ReturnType<typeof createServer>): number {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No TCP address for the test server");
  return address.port;
}

function setSessionCookies(response: ServerResponse, value: "initial" | "rotated") {
  response.setHeader("set-cookie", [
    `tp_access=${value}; HttpOnly; Secure; SameSite=Lax; Path=/`,
    `tp_refresh=${value}; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`,
  ]);
  response.writeHead(204).end();
}

test("[SC-OPS-002] forwards first-party session cookies through login and refresh on the production /api route", async ({
  page,
}) => {
  const received: string[] = [];
  const upstream = createServer((request, response) => {
    received.push(`${request.method} ${request.url}`);
    if (request.headers["x-testpulse-proxy-secret"] || request.headers["x-testpulse-client-ip"]) {
      response.writeHead(400).end();
    } else if (request.method === "POST" && request.url === "/api/v1/auth/login?source=web") {
      request.setEncoding("utf8");
      let body = "";
      request.on("data", (chunk: string) => {
        body += chunk;
      });
      request.on("end", () => {
        if (body !== JSON.stringify({ email: "browser@example.com" })) {
          response.writeHead(400).end();
          return;
        }
        setSessionCookies(response, "initial");
      });
    } else if (request.method === "POST" && request.url === "/api/v1/auth/refresh") {
      const cookies = request.headers.cookie ?? "";
      if (cookies.includes("tp_access=initial") && cookies.includes("tp_refresh=initial"))
        setSessionCookies(response, "rotated");
      else response.writeHead(401).end();
    } else if (request.method === "GET" && request.url === "/api/v1/auth/me") {
      response.writeHead(request.headers.cookie?.includes("tp_access=rotated") ? 204 : 401).end();
    } else {
      response.writeHead(404).end();
    }
  });

  const portProbe = createServer();
  await listen(portProbe);
  const webPort = portOf(portProbe);
  const portReleased = once(portProbe, "close");
  portProbe.close();
  await portReleased;

  await listen(upstream);
  const next = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(webPort)],
    {
      env: { ...process.env, API_INTERNAL_URL: `http://127.0.0.1:${portOf(upstream)}`, VERCEL: "0" },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  try {
    const web = `http://127.0.0.1:${webPort}`;
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`${web}/healthz`)).ok;
          } catch {
            return false;
          }
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.goto(`${web}/login`);
    await expect(page.getByRole("heading", { name: "Sign in to TestPulse" })).toBeVisible();
    const statuses = await page.evaluate(async () => {
      const login = await fetch("/api/v1/auth/login?source=web", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-testpulse-proxy-secret": "fixture",
          "x-testpulse-client-ip": "198.51.100.2",
        },
        body: JSON.stringify({ email: "browser@example.com" }),
      });
      const refresh = await fetch("/api/v1/auth/refresh", { method: "POST" });
      const me = await fetch("/api/v1/auth/me");
      return [login.status, refresh.status, me.status];
    });
    expect(statuses).toEqual([204, 204, 204]);
    expect(received).toEqual([
      "POST /api/v1/auth/login?source=web",
      "POST /api/v1/auth/refresh",
      "GET /api/v1/auth/me",
    ]);
    const cookies = await page.context().cookies();
    expect(
      cookies.map(({ name, value, domain, path, httpOnly, secure, sameSite }) => [
        name,
        value,
        domain,
        path,
        httpOnly,
        secure,
        sameSite,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["tp_access", "rotated", "127.0.0.1", "/", true, true, "Lax"],
        ["tp_refresh", "rotated", "127.0.0.1", "/api/v1/auth", true, true, "Lax"],
      ]),
    );
  } finally {
    upstream.closeAllConnections();
    upstream.close();
    if (next.exitCode === null && next.signalCode === null) {
      const exited = once(next, "exit");
      next.kill();
      await exited;
    }
  }
});
