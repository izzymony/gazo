import { useEffect, useRef } from "react";

// Find the nearest scrollable ancestor of `el`. Our storefront and marketplace
// scroll an INNER `overflow-y-scroll` container (not the window), so a
// viewport-rooted IntersectionObserver would never fire — the observer must root
// on that container. Returns null (→ viewport) when nothing scrollable is found.
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Infinite-scroll sentinel. Attach the returned ref to an element at the end of a
 * list; `onLoadMore` fires when it scrolls into view (auto-rooted on the nearest
 * scrollable ancestor). `onLoadMore` must itself no-op while already loading / when
 * there are no more pages — this hook only detects visibility, it does not guard
 * the fetch. Only observes while `hasMore` is true.
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  rootMargin = "400px"
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cb = useRef(onLoadMore);
  cb.current = onLoadMore;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const root = getScrollParent(el);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) cb.current();
      },
      { root, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, rootMargin]);

  return sentinelRef;
}
