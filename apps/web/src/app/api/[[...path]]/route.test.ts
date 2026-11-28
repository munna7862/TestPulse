import { randomUUID } from "node:crypto";
import { WEB_PROXY_CLIENT_IP_HEADER, WEB_PROXY_SECRET_HEADER } from "@testpulse/shared";
import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("[SC-AUTH-017] forwards the Vercel assertion only to the HTTPS upstream and hands redirects back to the browser", async () => {
  const credential = randomUUID();
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("API_INTERNAL_URL", "https://api.example.com");
  vi.stubEnv("WEB_PROXY_SHARED_SECRET", credential);
  const fetcher = vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(null, {
        status: 302,
        headers: { location: "https://identity.example.com/start", [WEB_PROXY_SECRET_HEADER]: credential },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetcher);

  const controller = new AbortController();
  const request = new NextRequest("https://web.example.com/api/v1/auth/oauth/google/start", {
    signal: controller.signal,
    headers: {
      "x-vercel-forwarded-for": "198.51.100.10",
      [WEB_PROXY_CLIENT_IP_HEADER]: "198.51.100.20",
      [WEB_PROXY_SECRET_HEADER]: "browser-assertion",
    },
  });
  const result = await GET(request);
  const [upstream, options] = fetcher.mock.calls[0] ?? [];
  const headers = new Headers(options?.headers);
  expect(upstream instanceof URL && upstream.href).toBe("https://api.example.com/api/v1/auth/oauth/google/start");
  expect(headers.get(WEB_PROXY_CLIENT_IP_HEADER)).toBe("198.51.100.10");
  expect(headers.get(WEB_PROXY_SECRET_HEADER) === credential).toBe(true);
  expect(options?.redirect).toBe("manual");
  expect(options?.signal).not.toBe(request.signal);
  controller.abort();
  expect(options?.signal?.aborted).toBe(true);
  expect(result.status).toBe(302);
  expect(result.headers.get("location")).toBe("https://identity.example.com/start");
  expect(result.headers.has(WEB_PROXY_SECRET_HEADER)).toBe(false);
});

it.each([
  { upstream: "http://api.example.com", platformAddress: "198.51.100.10" },
  { upstream: "https://api.example.com", platformAddress: "198.51.100.10, 198.51.100.20" },
])(
  "[SC-AUTH-017] forwards neither reserved header for an unverified handoff",
  async ({ upstream, platformAddress }) => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("API_INTERNAL_URL", upstream);
    vi.stubEnv("WEB_PROXY_SHARED_SECRET", randomUUID());
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 })));
    vi.stubGlobal("fetch", fetcher);
    await GET(
      new NextRequest("https://web.example.com/api/v1/auth/me", {
        headers: {
          "x-vercel-forwarded-for": platformAddress,
          [WEB_PROXY_CLIENT_IP_HEADER]: "198.51.100.20",
          [WEB_PROXY_SECRET_HEADER]: "browser-assertion",
        },
      }),
    );
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
    expect(headers.has(WEB_PROXY_CLIENT_IP_HEADER)).toBe(false);
    expect(headers.has(WEB_PROXY_SECRET_HEADER)).toBe(false);
  },
);
