"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import ErrorState from "@/design-system/common/ErrorState";

/** Group-level error boundary for the (buyer) area (W4.1). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ErrorState onRetry={() => reset()} title="Couldn't load this page" />;
}
