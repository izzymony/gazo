"use client";

import { reportError } from "@/lib/reportError";
import { useEffect } from "react";
import ErrorState from "@vibaar/ui/common/ErrorState";

/** Group-level error boundary for the (auth) area (W4.1). */
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

  return <ErrorState onRetry={() => reset()} title="Couldn't load this page" />;
}
