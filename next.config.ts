import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/portal", destination: "/customer", permanent: false },
      { source: "/portal/:path*", destination: "/customer/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
