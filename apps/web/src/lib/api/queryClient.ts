import { QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Tuned for the 85%-mobile / 3G base: dedupe identical in-flight
        // requests, keep data fresh for a minute so navigation doesn't refetch,
        // and don't refetch on window focus (costly on mobile data).
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Shared query client. The browser uses a singleton so imperative code (Zustand
 * store actions calling `fetchQuery`) shares the exact same cache as the React
 * `useQuery` hooks; the server always gets a fresh client per request (no
 * cross-request state leakage). (W2.5)
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
