import { useCallback, useEffect, useState } from "react";

/**
 * Tracks whether a scroll container has passed `threshold` pixels — the signal
 * the storefront and product headers use to collapse into their compact form.
 *
 * Attach the returned `scrollRef` to the element that scrolls:
 *
 *     const { isScrolled, scrollRef } = useScroll(20);
 *     <div ref={scrollRef} className="h-full overflow-y-scroll">
 *
 * The hook owns the subscription. It used to hand back an `addScrollListener`
 * that each caller wired up in its own effect, and two of the four callers wired
 * it up wrongly — the marketplace called it from the effect's CLEANUP, so it
 * attached on teardown, threw the unsubscribe away, and leaked a listener per
 * run. That is a class of mistake a caller should not be able to make, so there
 * is nothing left to wire.
 *
 * `scrollRef` is a callback ref so the subscription follows the element rather
 * than the render. These screens show a skeleton before their scroller exists,
 * and the marketplace swaps in a different scroller for its search view; a
 * callback ref fires on both, where a RefObject captured in a mount effect would
 * not. (The old hook did survive the late mount, but only by accident: it rebuilt
 * `addScrollListener` on every render and callers depended on it, so every render
 * — including every render its own state change caused — tore the listener down
 * and re-added it until one of them happened to catch the element. This does it
 * once, on purpose.)
 */
export const useScroll = (threshold: number) => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const scrollRef = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    const read = () => setIsScrolled(element.scrollTop > threshold);

    // Read once on attach: an element can mount already scrolled (a restored
    // position on back-navigation), and waiting for an event would show the
    // wrong header until the user moved.
    read();

    element.addEventListener("scroll", read, { passive: true });
    return () => element.removeEventListener("scroll", read);
  }, [element, threshold]);

  return { isScrolled, scrollRef };
};

export default useScroll;
