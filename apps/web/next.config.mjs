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
    // On Cloudflare Workers the default Next image optimizer (needs sharp/Node)
    // is unavailable, so the OpenNext/CF build serves images unoptimized (set
    // CF_BUILD=1 in the Cloudflare build env). Vercel/other builds keep
    // optimization. For a production CF launch, revisit this (Cloudflare Images
    // or a custom loader) — unoptimized ships full-size images to 3G users.
    unoptimized: process.env.CF_BUILD === '1',
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
  // P4: keep the service-worker precache lean. It was precaching ALL of public/
  // (~49 MB) to every install. Drop source maps, cap per-file size, and skip the
  // heavy Figma/hero/splash image dirs — those load on demand, not needed offline.
  buildExcludes: [/\.map$/],
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  publicExcludes: [
    "!noprecache/**/*",
    "!figma-assets/**/*",
    "!images/landing/**/*",
    "!images/splash/**/*",
  ],
})(withBundleAnalyzer(nextConfig));

// Wrap with Sentry (only active when NEXT_PUBLIC_SENTRY_DSN is set). SKIPPED for
// the Cloudflare/OpenNext build (CF_BUILD=1): the Sentry server SDK's auto-
// instrumentation (experimental.instrumentationHook) makes OpenNext's Workers
// server bundler fail to resolve Next's internal server modules (DEPLOY.md §3.3).
// Client-side error reporting is lazy-loaded (P1b) and works without this wrapper.
export default process.env.CF_BUILD === '1'
  ? pwaConfig
  : withSentryConfig(pwaConfig, {
      silent: true,
      // Tier4: `disableLogger` is deprecated in @sentry/nextjs v10 → moved to
      // webpack.treeshake.removeDebugLogging (strips the SDK's debug logger).
      webpack: {
        treeshake: {
          removeDebugLogging: true,
        },
      },
    });
