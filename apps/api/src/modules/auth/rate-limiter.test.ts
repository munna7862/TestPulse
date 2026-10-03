import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { byIp } from "./rate-limiter";

const requestFrom = (ip: string) => ({ ip }) as FastifyRequest;

describe("rate-limit keys", () => {
  it("[SC-AUTH-017] keys IPv6 clients by /64 so rotating addresses inside one block shares a counter", () => {
    expect(byIp(requestFrom("2001:db8:1:2::1"))).toBe(byIp(requestFrom("2001:db8:1:2:ffff::9")));
    expect(byIp(requestFrom("2001:db8:1:2::1"))).not.toBe(byIp(requestFrom("2001:db8:1:3::1")));
  });

  it("[SC-AUTH-017] treats an IPv4-mapped IPv6 address like the plain IPv4 address", () => {
    expect(byIp(requestFrom("::ffff:203.0.113.5"))).toBe(byIp(requestFrom("203.0.113.5")));
  });
});
