/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs';
import withPWA from 'next-pwa';
import bundleAnalyzer from '@next/bundle-analyzer';

// Wire the (already-installed) analyzer behind ANALYZE=true for the perf baseline.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const nextConfig = {
  reactStrictMode: true,
  // Transpile raw-TS workspace packages consumed from packages/* (M1 extraction).
  transpilePackages: ['@vibaar/types', '@vibaar/api-client', '@vibaar/ui'],
  // Allow mobile devices to access dev server
  allowedDevOrigins: ['192.168.221.10', '192.168.1.157', 'michaels-macbook-pro-2.local'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8088',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.221.10',
        port: '8088',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.157',
        port: '8088',
        pathname: '/uploads/**',
      },
    ],
  },
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV !== "development",
  },
  eslint: {
    // Kept true until W5 (lint cleanup). The TypeScript gate below is the load-bearing one.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // W0.2: type errors now BLOCK the build. The W0.1 burndown cleared all 185 (tsc --noEmit is clean).
    ignoreBuildErrors: false,
  },
  // Performance optimizations
  experimental: {
    // Per-icon imports instead of full barrels. The old ['react-icons'] was a
    // no-op (react-icons isn't installed); the heavy libs are HugeIcons.
    optimizePackageImports: ['@hugeicons/react', '@hugeicons/core-free-icons', '@heroicons/react'],
  },
  // Webpack optimizations for development
  webpack: (config, { dev }) => {
    // Native FS events by default (fast). Opt into polling only where a setup
    // needs it (network drive / VM / some LAN-device cases) via WATCHPACK_POLLING=true.
    // The old unconditional poll:1000 pegged CPU + slowed HMR on the 214MB tree.
    if (dev && process.env.WATCHPACK_POLLING === 'true') {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

// Configuration object tells the next-pwa plugin
const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(withBundleAnalyzer(nextConfig));

// Wrap with Sentry (only active when NEXT_PUBLIC_SENTRY_DSN is set)
export default withSentryConfig(pwaConfig, {
  silent: true,
  disableLogger: true,
});
