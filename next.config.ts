import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // GLB uploads are larger than the 10MB default body clone limit.
    middlewareClientMaxBodySize: "64mb",
    serverActions: {
      bodySizeLimit: "64mb",
    },
  },
};

export default nextConfig;
