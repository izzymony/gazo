"use client";
import React, { ReactNode, useState, useRef, useEffect, useId } from "react";
import ReactDOM from "react-dom";
import { cn } from "@vibaar/utils";
import useModalBehaviour from "./useModalBehaviour";

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** extra classes for the content panel */
  className?: string;
  /**
   * Visible dialog title. Rendered as a heading and wired to the dialog via
   * aria-labelledby, which is the accessible name a screen reader announces on
   * open. Prefer this over `ariaLabel`.
   */
  title?: React.ReactNode;
  /** Accessible name when the dialog has no visible title. */
  ariaLabel?: string;
};

/**
 * Canonical responsive modal primitive (W3.5): bottom sheet on mobile,
 * centered dialog on desktop (`lg:`). Built on the proven BottomModal render
 * (portal + backdrop-close + touch-drag-dismiss + keyboard-aware height), plus
 * the a11y the app's ad-hoc modals lacked:
 *   - Escape closes
 *   - focus trap (Tab cycles inside; focus restored to the trigger on close)
 *   - body scroll-lock while open
 *   - role="dialog" + aria-modal
 *   - prefers-reduced-motion respected
 * Visually identical to the old BottomModal; only behaviour/a11y is added.
 */
const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children, className = "", title, ariaLabel }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [startY, setStartY] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Keyboard-aware viewport height (unchanged from BottomModal)
  useEffect(() => {
    if (!isOpen) {
      setTranslateY(0);
      return;
    }
    setViewportHeight(window.visualViewport?.height || window.innerHeight);
    const onVV = () => {
      if (window.visualViewport) setViewportHeight(window.visualViewport.height);
    };
    const onRz = () => setViewportHeight(window.innerHeight);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", onVV);
    else window.addEventListener("resize", onRz);
    return () => {
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", onVV);
      else window.removeEventListener("resize", onRz);
    };
  }, [isOpen]);

  // Escape, scroll-lock, focus trap and focus restore — shared with the
  // product image viewer, which needs the same behaviour behind different
  // chrome. See useModalBehaviour.
  useModalBehaviour({ isOpen, onClose, panelRef });

  const handleTouchStart = (e: React.TouchEvent) => setStartY(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) setTranslateY(deltaY);
  };
  const handleTouchEnd = () => {
    if (translateY > 100) onClose();
    setTranslateY(0);
  };

  if (!isOpen) return null;
  const maxHeight = Math.min(viewportHeight * 0.9, 600);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-modal flex items-end lg:items-center justify-center bg-overlay/60 backdrop-blur-sm"
      style={{ height: viewportHeight }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        // A dialog with no accessible name announces only "dialog". Prefer the
        // visible title; fall back to ariaLabel only when there is none.
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={cn(
          "flex flex-col w-full lg:max-w-md lg:rounded-2xl bg-white rounded-t-xl p-4 lg:p-6 shadow-lg transition-transform duration-300 motion-reduce:transition-none outline-none",
          className
        )}
        // The panel is NOT the scroll container. It was, and the scrollbar then
        // rendered inside the rounded, padded card — over the corner radius, so
        // a long dialog grew a grey squared-off edge the card did not have. The
        // title scrolled away with the content for the same reason. The body
        // below is the only scroll region, which is what ResponsiveRouteDialog
        // already does.
        style={{ transform: `translateY(${translateY}px)`, maxHeight: `${maxHeight}px` }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator — mobile only */}
        <div className="shrink-0 w-12 h-1 bg-surface-strong rounded-full mx-auto mb-4 lg:hidden" />
        {title && (
          <h2 id={titleId} className="shrink-0 mb-3 text-h2 font-semibold text-foreground-primary">
            {title}
          </h2>
        )}
        {/* `min-h-0` is what lets a flex child actually scroll rather than grow
            past its parent. `scrollbar-hide` matches PageShell's scroll region. */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Dialog;
