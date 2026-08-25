"use client";

import { reportError } from "@/lib/reportError";
import { useEffect } from "react";
import ErrorState from "@vibaar/ui/common/ErrorState";

/**
 * Root app-segment error boundary (W4.1). Renders inside the root layout so the
 * app chrome survives — a page error no longer blows away the whole app via
 * global-error. Reports to Sentry; UI is the shared ErrorState.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return <ErrorState onRetry={() => reset()} />;
}
