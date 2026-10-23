import type { NextConfig } from "next";
import { securityHeaders } from "./config/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env, process.env.NODE_ENV !== "production") }];
  },
};

export default nextConfig;
