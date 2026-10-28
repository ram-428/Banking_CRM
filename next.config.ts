import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/portal", destination: "/customer", permanent: false },
      { source: "/portal/:path*", destination: "/customer/:path*", permanent: false },
      // Lending-flow screens are outside the BRD; the work now lives in the service request workspace.
      { source: "/applications/:path*", destination: "/service-requests", permanent: false },
      { source: "/applications", destination: "/service-requests", permanent: false },
      { source: "/bank-submissions", destination: "/service-requests", permanent: false },
      { source: "/bank-responses", destination: "/service-requests", permanent: false },
      { source: "/disbursements", destination: "/service-requests", permanent: false },
      { source: "/agreements", destination: "/service-requests", permanent: false },
      { source: "/closures", destination: "/service-requests", permanent: false },
      { source: "/credit-reviews", destination: "/service-requests", permanent: false },
      { source: "/workflow", destination: "/work-queue", permanent: false },
      { source: "/tasks", destination: "/work-queue", permanent: false },
      { source: "/task-assignment", destination: "/work-queue", permanent: false },
      { source: "/follow-ups", destination: "/work-queue", permanent: false },
      { source: "/financials", destination: "/customers", permanent: false },
      { source: "/statements", destination: "/customers", permanent: false },
      { source: "/vat-returns", destination: "/customers", permanent: false },
      { source: "/audit-reports", destination: "/customers", permanent: false },
    ];
  },
};

export default nextConfig;
