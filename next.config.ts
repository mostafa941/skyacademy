import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Compress responses
  compress: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },

  // Selective cache control per route type
  async headers() {
    return [
      // Rooms and subjects are relatively static - short public cache
      {
        source: '/api/rooms',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=120, stale-while-revalidate=300' },
        ],
      },
      {
        source: '/api/subjects',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=120, stale-while-revalidate=300' },
        ],
      },
      // Teacher/student data - very short private cache
      {
        source: '/api/teachers',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=15, stale-while-revalidate=30' },
        ],
      },
      {
        source: '/api/teachers/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=10, stale-while-revalidate=20' },
        ],
      },
      // Payments, attendance, income - no cache (real-time)
      {
        source: '/api/payments',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/api/attendance',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/api/income',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/api/expenses',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      // All other API routes - private, no-store by default
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
