"use client";

import { ReactNode, useId, useRef } from "react";
import { cn } from "@vibaar/utils";
import useModalBehaviour from "./useModalBehaviour";
import IconButton from "./IconButton";
import { X } from "../icons";

export interface ResponsiveRouteDialogProps {
  /** Visible title. Also the dialog's accessible name. */
  title: string;
  /** Dismiss. On a route-backed dialog this is `router.back()`. */
  onClose: () => void;
  children: ReactNode;
  /** The commit action. Rendered in a footer that does NOT scroll. */
  footer?: ReactNode;
  /** `lg` (640px) for a dialog holding a form; `md` (448px) for a confirmation. */
  size?: "md" | "lg";
}

/**
 * ResponsiveRouteDialog — a dialog whose mobile presentation is a full screen.
 *
 * WHY THIS EXISTS SEPARATELY FROM `Dialog`. `Dialog` is a bottom sheet that
 * becomes a centred card: an overlay on a page you are still on. This is for a
 * flow that is a ROUTE — the buyer or seller navigated to it, it has a URL, and
 * on a phone it must look and behave exactly like the full-screen page it has
 * always been, back button and all. A sheet sliding up over the settings list
 * would be a different product on mobile, which this work may not do.
 *
 * ONE TREE, CSS CHOOSES THE CHROME. The two presentations are not two
 * components and not a breakpoint hook. A route-backed dialog's desktop and
 * mobile forms would otherwise be different route SEGMENTS, and resizing the
 * window does not swap route segments — so a hook would have to re-navigate, and
 * a second component would duplicate the form's state. Here the same nodes are
 * a full-bleed screen below `lg` and a bounded panel at `lg`, and a resize is a
 * repaint.
 *
 * THE RAIL. The backdrop dims the whole viewport; the panel centres inside the
 * CONTENT area, because a panel centred on the viewport sits visibly off-centre
 * next to a 256px rail — and half-under it at 1024. That is why this renders in
 * place rather than portalling to `document.body`: `--shell-inset` inherits down
 * the DOM, so a portal outside the declaring frame reads the `0px` fallback and
 * cannot be taught the rail's width without hoisting a global. Mounted by a
 * parallel-route slot inside the frame, it simply inherits it.
 *
 * The footer does not scroll. `Dialog` put `overflow-y: auto` on the panel
 * itself, so a footer CTA scrolled out of reach on a long form — the recorded
 * reason one screen was never migrated to it.
 */
export default function ResponsiveRouteDialog({
  title,
  onClose,
  children,
  footer,
  size = "lg",
}: ResponsiveRouteDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Escape, scroll-lock, focus trap and focus restore. `isOpen` is always true:
  // a route-backed dialog is mounted by its route and unmounted by navigating
  // away, so "closed" is not a state it can be in.
  useModalBehaviour({ isOpen: true, onClose, panelRef });

  return (
    <div
      // Below lg there is no backdrop to see — the panel covers the viewport —
      // so the dimming and the blur are lg-only rather than being painted and
      // then hidden behind an opaque child.
      className="fixed inset-0 z-modal lg:bg-overlay/60 lg:backdrop-blur-sm"
      onClick={onClose}>
      <div
        // The centring layer, inset by the rail. `inset-0` below lg so the panel
        // has the whole viewport to fill.
        className="fixed inset-0 lg:left-shell-inset lg:flex lg:items-center lg:justify-center lg:p-8">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex h-full w-full flex-col bg-surface outline-none",
            "lg:h-auto lg:w-full lg:max-h-dialog lg:rounded-panel lg:shadow-pop",
            size === "lg" ? "lg:max-w-dialog-lg" : "lg:max-w-dialog"
          )}>
          {/* Header. `shrink-0` so a long body cannot squeeze the title row. */}
          <div className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-3 lg:px-6 lg:pt-5">
            <h2
              id={titleId}
              className="min-w-0 flex-1 truncate text-body-lg font-medium text-foreground-primary lg:text-h1">
              {title}
            </h2>
            <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2 lg:mr-0" />
          </div>

          {/* The ONLY scroll region. `min-h-0` is what lets it actually scroll
              inside a flex column instead of growing the panel past its cap. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 lg:px-6">{children}</div>

          {footer ? (
            <div className="shrink-0 border-t border-outline-subtle px-4 pb-5 pt-3 lg:px-6 lg:pb-5">
              {/* No 176px floor here. That minimum belongs to INLINE actions,
                  which have a whole content column to look incidental in; a
                  dialog button is intrinsic, and padding it out to 176 left the
                  label sitting 22px off the panel's right edge. */}
              <div className="contents lg:block lg:ml-auto lg:w-fit">{footer}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
