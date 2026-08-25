// P1b — load Sentry OFF the critical path.
//
// A static `import * as Sentry` here put the ~101 KB gz core SDK into the shared
// first-load JS on every route. Dynamic-import it after the app boots instead, so
// nothing Sentry-related blocks first render — the SDK becomes an async chunk
// fetched on demand. Gated on DSN so dev / previews ship zero Sentry. Tracing is
// dropped (no `tracesSampleRate` → no browser-tracing integration): we keep error
// reporting only, which also trims the core chunk.
//
// Trade-off (accepted): an error thrown in the brief window before this async
// import resolves is not captured by the global handlers. React error *boundaries*
// still report independently via `reportError()` (src/lib/reportError.ts).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      enabled: true,
    });
  });
}

// Tracing is intentionally disabled (P1b), so navigation instrumentation is a
// no-op. Exporting this stub silences the SDK's build-time "ACTION REQUIRED:
// export onRouterTransitionStart" nudge without pulling Sentry back into the
// shared chunk (a real `Sentry.captureRouterTransitionStart` would need a static
// import). Re-point it at the real hook only if browser tracing is re-enabled.
export const onRouterTransitionStart = () => {};
