import type { NextConfig } from "next";

/**
 * Free deployment profile (master plan §4.4): the browser calls `/api/*` on the web origin and Next.js
 * proxies it to the API, so auth cookies are first-party. `API_INTERNAL_URL` is server-only and is read
 * at BUILD time (Next.js bakes rewrites into the build), so it must be set in the build environment.
 */
const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@testpulse/shared"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternalUrl}/api/:path*` }];
  },
};

export default nextConfig;
