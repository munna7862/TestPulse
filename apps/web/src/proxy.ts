import { randomBytes } from "node:crypto";
import { WEB_PROXY_SECRET_HEADER } from "@testpulse/shared";
import { type NextRequest, NextResponse } from "next/server";

function socketSources(): string {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!configured) return "";
  try {
    const url = new URL(configured);
    if (url.protocol === "https:") return ` ${url.origin} wss://${url.host}`;
    if (url.protocol === "http:") return ` ${url.origin} ws://${url.host}`;
  } catch {
    // Keep same-origin connections available when the socket URL is invalid.
  }
  return "";
}

export function proxy(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  const nonce = randomBytes(18).toString("base64");
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src 'self'${socketSources()}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const headers = new Headers(request.headers);
  // Page rendering uses the public app shell. The /api route separately receives session credentials.
  headers.delete("authorization");
  headers.delete("cookie");
  headers.delete(WEB_PROXY_SECRET_HEADER);
  headers.set("x-testpulse-nonce", nonce);
  // Next.js reads the request policy when assigning nonces to its own scripts.
  headers.set("content-security-policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", policy);
  response.headers.set("strict-transport-security", "max-age=31536000");
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|healthz|robots.txt|sitemap.xml).*)"],
};
