"use client";

import { RefObject, useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The behaviour every modal surface owes its user, independent of how it looks.
 *
 * Escape closes; the page behind stops scrolling; focus moves into the surface
 * and cannot Tab out of it; and on close focus returns to whatever opened it.
 *
 * It is a hook rather than part of `Dialog` because not every modal surface is
 * a dialog panel. The product image viewer is a full-bleed black canvas you
 * swipe through — forcing it into Dialog's sheet chrome would be wrong, and
 * Dialog's own drag-to-dismiss would fight the swipe. Before this it reimple-
 * mented the easy half (Escape, scroll-lock) and omitted the rest, so the
 * viewer had no dialog role, no focus trap, and dropped you back at the top of
 * the product page on close.
 *
 * `panelRef` must point at the element that contains the modal's focusables.
 * Give it `tabIndex={-1}` so it can receive focus itself when nothing inside is
 * focusable.
 */
export default function useModalBehaviour({
  isOpen,
  onClose,
  panelRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusables.length === 0) {
        // Nothing to move to — keep focus on the panel rather than letting it
        // escape to the page behind.
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose, panelRef]);
}
