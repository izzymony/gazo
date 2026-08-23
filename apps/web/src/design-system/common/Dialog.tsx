"use client";
import React, { ReactNode, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** extra classes for the content panel */
  className?: string;
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
const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children, className = "", ariaLabel }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
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

  // a11y: scroll-lock, Escape-to-close, focus trap + restore
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onClose]);

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
      className="fixed inset-0 z-modal flex items-end lg:items-center justify-center bg-ink-60 backdrop-blur-sm"
      style={{ height: viewportHeight }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cn(
          "w-full lg:max-w-md lg:rounded-2xl bg-white rounded-t-xl p-4 lg:p-6 shadow-lg transition-transform duration-300 motion-reduce:transition-none outline-none",
          className
        )}
        style={{ transform: `translateY(${translateY}px)`, maxHeight: `${maxHeight}px`, overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator — mobile only */}
        <div className="w-12 h-1 bg-ink-20 rounded-full mx-auto mb-4 lg:hidden" />
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Dialog;
