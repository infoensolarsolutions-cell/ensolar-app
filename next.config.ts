import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep react-pdf out of the server bundle and ship the peso-capable
  // fonts with the PDF route on Vercel.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/api/quotations/[id]/pdf": ["./public/fonts/**"],
    "/api/payments/[id]/pdf": ["./public/fonts/**"],
    "/api/pos/[id]/pdf": ["./public/fonts/**"],
  },
};

export default nextConfig;
