import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  // P1: Session Replay removed — its rrweb bundle was ~101 KB gz (64% of the
  // shared first-load JS) on every route. Error reporting + light tracing stay.
  // Re-add lazily via Sentry.lazyLoadIntegration("replayIntegration") if needed.
});
