import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
      {
        source: '/stream',
        destination: 'http://127.0.0.1:8000/stream',
      },
      {
        source: '/reset',
        destination: 'http://127.0.0.1:8000/reset',
      }
    ];
  },
};

export default nextConfig;
