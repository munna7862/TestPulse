import { timingSafeEqual } from "node:crypto";
import { WEB_PROXY_CLIENT_IP_HEADER, WEB_PROXY_SECRET_HEADER, WebProxyClientIpSchema } from "@testpulse/shared";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    verifiedClientIp?: string;
  }
}

/** Authenticate the Vercel handoff independently of the socket's normal trustProxy setting. */
export function registerVerifiedProxy(app: FastifyInstance, sharedSecret: string | undefined): void {
  if (!sharedSecret) return;
  const expected = Buffer.from(sharedSecret);
  app.decorateRequest("verifiedClientIp");

  app.addHook("onRequest", async (request) => {
    const credential = request.headers[WEB_PROXY_SECRET_HEADER];
    if (typeof credential !== "string" || credential.length !== expected.length) return;
    const received = Buffer.from(credential);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return;
    const clientIp = WebProxyClientIpSchema.safeParse(request.headers[WEB_PROXY_CLIENT_IP_HEADER]);
    if (clientIp.success) request.verifiedClientIp = clientIp.data;
  });
}
