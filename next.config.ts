import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const publicPreviewHeaders = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type, User-Agent, X-Requested-With, Accept, Range" },
      { key: "Access-Control-Max-Age", value: "86400" }
    ];

    return [
      {
        source: "/",
        headers: publicPreviewHeaders
      },
      {
        source: "/share",
        headers: publicPreviewHeaders
      },
      {
        source: "/social-card-v:version(\\d+).jpg",
        headers: publicPreviewHeaders
      }
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"]
  }
};

export default nextConfig;
