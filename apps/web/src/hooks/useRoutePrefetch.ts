import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

/**
 * Warm a route (its RSC payload + JS chunk) on hover / touch intent so a
 * subsequent tap opens instantly. Our product/store cards navigate via
 * `router.push` (not `<Link>`), so Next's automatic viewport prefetch never runs —
 * this restores it, triggered on intent and deduped so each href is warmed once.
 * Best-effort: prefetch failures are swallowed.
 */
export function useRoutePrefetch() {
  const router = useRouter();
  const warmed = useRef<Set<string>>(new Set());
  return useCallback(
    (href?: string) => {
      if (!href || warmed.current.has(href)) return;
      warmed.current.add(href);
      try {
        router.prefetch(href);
      } catch {
        /* best-effort */
      }
    },
    [router]
  );
}
