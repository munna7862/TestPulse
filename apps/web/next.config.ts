import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@testpulse/shared", "@testpulse/ui"],
};

export default nextConfig;
