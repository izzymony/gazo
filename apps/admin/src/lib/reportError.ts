/**
 * P1b — lazy error reporter.
 *
 * The Sentry SDK (@sentry/nextjs, ~101 KB gz) was landing in the shared first-load
 * JS on EVERY route because the error boundaries statically imported it. This helper
 * dynamically imports Sentry only when it's actually called — i.e. only when an error
 * boundary renders — so the SDK sits in an async chunk fetched on demand, not on the
 * critical path. No-op when no DSN is configured (dev / previews pay nothing).
 */
export function reportError(error: unknown) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import("@sentry/nextjs")
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {
      // Sentry failed to load (offline / blocked) — never let reporting throw.
    });
}
