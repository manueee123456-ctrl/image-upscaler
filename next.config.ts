import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: "64mb",
    },
    proxyClientMaxBodySize: "64mb",
  },
};

export default nextConfig;
