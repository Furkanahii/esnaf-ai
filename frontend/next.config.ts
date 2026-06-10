import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === "production" 
    ? "https://esnaf-ai-backend-production.up.railway.app" 
    : "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/health',
        destination: `${BACKEND_URL}/health`,
      },
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/stream',
        destination: `${BACKEND_URL}/stream`,
      },
      {
        source: '/reset',
        destination: `${BACKEND_URL}/reset`,
      }
    ];
  },
};

export default nextConfig;
