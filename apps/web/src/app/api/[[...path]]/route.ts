import {
  type ApiFailure,
  WEB_PROXY_CLIENT_IP_HEADER,
  WEB_PROXY_SECRET_HEADER,
  WebProxyClientIpSchema,
  WebProxySecretSchema,
} from "@testpulse/shared";
import type { NextRequest } from "next/server";

const hopHeaders = [
  "connection",
  "keep-alive",
  "proxy-authorization",
  "proxy-authenticate",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function endToEndHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  for (const header of source.get("connection")?.split(",") ?? []) {
    const name = header.trim();
    if (/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) headers.delete(name);
  }
  for (const header of hopHeaders) headers.delete(header);
  return headers;
}

async function forward(request: NextRequest): Promise<Response> {
  const url = new URL(process.env.API_INTERNAL_URL ?? "http://localhost:4000");
  url.pathname = request.nextUrl.pathname;
  url.search = request.nextUrl.search;

  const headers = endToEndHeaders(request.headers);
  for (const header of [
    "host",
    "content-length",
    "forwarded",
    "x-forwarded-for",
    WEB_PROXY_CLIENT_IP_HEADER,
    WEB_PROXY_SECRET_HEADER,
  ]) {
    headers.delete(header);
  }
  if (process.env.VERCEL === "1" && url.protocol === "https:") {
    const clientIp = WebProxyClientIpSchema.safeParse(request.headers.get("x-vercel-forwarded-for"));
    const secret = WebProxySecretSchema.safeParse(process.env.WEB_PROXY_SHARED_SECRET);
    if (clientIp.success && secret.success) {
      headers.set(WEB_PROXY_CLIENT_IP_HEADER, clientIp.data);
      headers.set(WEB_PROXY_SECRET_HEADER, secret.data);
    }
  }

  const init: RequestInit & { duplex: "half" } = {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
  };
  try {
    const upstream = await fetch(url, init);
    const responseHeaders = endToEndHeaders(upstream.headers);
    // Node fetch decodes content encodings. Let the web server frame the decoded response.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete(WEB_PROXY_SECRET_HEADER);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    const error: ApiFailure = {
      success: false,
      error: { code: "SERVICE_UNAVAILABLE", message: "The API is temporarily unavailable." },
    };
    return Response.json(error, { status: 502 });
  }
}

export {
  forward as GET,
  forward as HEAD,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
  forward as OPTIONS,
};
