import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables proper server-side rendering for Vercel deployment
  reactStrictMode: true,
  // Allow cross-origin headers needed for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
