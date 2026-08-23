"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import ErrorState from "@vibaar/ui/common/ErrorState";

/** Error boundary for the profile area (W4.1) — isolates failures here from the rest of the app. */
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

  return (
    <ErrorState
      onRetry={() => reset()}
      title="Couldn't load your profile"
      message="Something went wrong loading your profile. Please try again."
    />
  );
}
