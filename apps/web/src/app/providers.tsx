"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { getQueryClient } from "@/lib/api/queryClient";

/**
 * App-wide TanStack Query provider (W2.5).
 *
 * Defaults are tuned for the 85%-mobile / 3G audience: identical mounts dedupe
 * into one in-flight request, data stays fresh for a minute so navigating back
 * to a page doesn't refetch, and we don't refetch on every window focus (which
 * is costly on mobile data). Migrate store-based fetches to useQuery one slice
 * at a time; this provider just makes the hooks available everywhere.
 */
export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Shared singleton on the browser so store actions (fetchQuery) hit the same
  // cache as the React hooks; defaults live in getQueryClient.
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
