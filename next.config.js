/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'a0.muscache.com' },
      { protocol: 'https', hostname: 'cf.bstatic.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  experimental: {
    optimizePackageImports: ['@anthropic-ai/sdk', '@supabase/supabase-js', '@supabase/ssr'],
  },
  async redirects() {
    return [
      { source: '/riviera', destination: '/azur', permanent: true },
      { source: '/riviera/:path*', destination: '/azur/:path*', permanent: true },
      { source: '/azur/services', destination: '/azur', permanent: true },
      { source: '/azur/bateau/:id', destination: '/azur', permanent: true },
    ];
  },
};

module.exports = nextConfig;
