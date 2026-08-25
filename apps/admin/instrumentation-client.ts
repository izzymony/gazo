// P1b — load Sentry OFF the critical path (mirrors apps/web).
//
// Dynamic-import the SDK after the app boots so the ~101 KB gz core SDK stays out
// of the shared first-load JS. Gated on a real DSN (the template placeholder never
// initializes). Tracing dropped (no `tracesSampleRate`) — error reporting only.
//
// Trade-off (accepted): errors in the brief window before the async import resolves
// aren't caught by the global handlers; error boundaries report via reportError().
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const enabled = !!dsn && dsn !== "your-sentry-dsn-for-error-tracking";

if (enabled) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV,
      enabled: true,
    });
  });
}

// Tracing intentionally disabled (P1b) — navigation instrumentation is a no-op.
// This stub silences the SDK's build-time "export onRouterTransitionStart" nudge
// without pulling Sentry back into the shared chunk.
export const onRouterTransitionStart = () => {};
