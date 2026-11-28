import { z } from "zod";

export const WEB_PROXY_CLIENT_IP_HEADER = "x-testpulse-client-ip";
export const WEB_PROXY_SECRET_HEADER = "x-testpulse-proxy-secret";

export const WebProxyClientIpSchema = z.union([z.ipv4(), z.ipv6()]);
export const WebProxySecretSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{32,128}$/, "Expected a 32–128 character proxy key.");
