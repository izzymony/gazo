"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import Button from "../common/Button";

/**
 * Shared branded error UI (W4.1) — used by the root and per-area `error.tsx`
 * boundaries so a page error shows a consistent, on-brand recovery screen
 * instead of a blank fallback.
 */
export default function ErrorState({
  onRetry,
  title = "Something went wrong",
  message = "We hit a snag loading this. We’ve been notified and are on it — please try again.",
}: {
  onRetry: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <div className="min-h-[70vh] w-full flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-5">
        <HugeiconsIcon icon={AlertCircleIcon} size={30} color="var(--brand)" />
      </div>
      <h2 className="text-h2 font-semibold text-foreground-primary mb-2 text-balance">
        {title}
      </h2>
      <p className="text-body text-foreground-secondary mb-6 max-w-xs leading-[20px]">
        {message}
      </p>
      <div className="w-full max-w-xs">
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}
