import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_DSN !== "your-sentry-dsn-for-error-tracking",
  tracesSampleRate: 0.2,
  // P1: Session Replay removed (see apps/web) — heavy rrweb bundle; admin is
  // low-traffic internal. Error reporting + light tracing stay.
});
