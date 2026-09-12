"use client";

import { cloneElement, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { cn } from "@vibaar/utils";

/**
 * Whether a pointer of this kind should reveal a hover label.
 *
 * Exported and pure because it cannot be driven through React's event path in
 * jsdom: there is no `PointerEvent` there, so `pointerType` always arrives null
 * and the touch branch would go untested inside the component.
 *
 * An unknown type counts as hover-capable — that is what a null reads as, and a
 * tooltip that fails to appear is a worse failure than one that appears once.
 */
export const pointerCanHover = (pointerType: string | null | undefined) =>
  pointerType !== "touch" && pointerType !== "pen";

export interface TooltipProps {
  /** What the tooltip says. Kept short — it is a label, not documentation. */
  label: ReactNode;
  /** Which side of the trigger it opens on. */
  side?: "end" | "top";
  /** The trigger. Receives the wiring; must forward props to a real element. */
  children: ReactElement;
  className?: string;
}

/**
 * A hover-and-focus label for a control that shows only an icon.
 *
 * DESCRIBES, never names. The controls that need this — a collapsed navigation
 * rail — already carry their own accessible name, so wiring the tooltip as a
 * label would make a screen reader announce every destination twice. It is
 * `aria-describedby`, and the trigger keeps whatever name it had.
 *
 * Opens on FOCUS as well as hover, which is the half that usually goes missing:
 * a keyboard user tabbing a rail of glyphs otherwise gets no confirmation of
 * what any of them is. Escape dismisses without moving focus, so a tooltip
 * cannot trap someone mid-traversal.
 *
 * No touch trigger, deliberately. On a touch device there is no hover to reveal
 * it and a long-press fights the platform; those users get the bottom tab bar,
 * which is labelled by position and habit rather than by hover.
 */
export default function Tooltip({ label, side = "end", children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  // Pointer and keyboard can both be "on" at once — a mouse resting on a
  // control that also has focus. Tracking them separately stops one leaving
  // from closing a tooltip the other is still holding open.
  const held = useRef({ hover: false, focus: false });

  const sync = () => setOpen(held.current.hover || held.current.focus);

  const trigger = {
    "aria-describedby": open ? id : undefined,
    onPointerEnter: (event: React.PointerEvent) => {
      // A touch "hover" fires once on tap and would flash the tooltip.
      if (!pointerCanHover(event.pointerType)) return;
      held.current.hover = true;
      sync();
    },
    onPointerLeave: () => {
      held.current.hover = false;
      sync();
    },
    onFocus: (event: React.FocusEvent) => {
      // Only keyboard focus: a click already reveals whatever it activated.
      held.current.focus = event.target.matches(":focus-visible");
      sync();
    },
    onBlur: () => {
      held.current.focus = false;
      sync();
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key !== "Escape" || !open) return;
      // Dismiss without moving focus, so Escape does not cost a tab position.
      event.stopPropagation();
      held.current = { hover: false, focus: false };
      setOpen(false);
    },
  };

  return (
    <span className={cn("relative inline-flex", className)}>
      {cloneElement(children, trigger)}
      <span
        id={id}
        role="tooltip"
        aria-hidden={!open}
        className={cn(
          "pointer-events-none absolute z-dropdown whitespace-nowrap rounded-field bg-surface-inverse px-2 py-1",
          "text-caption font-medium text-foreground-inverse shadow-pop",
          "transition-opacity duration-150",
          open ? "opacity-100" : "opacity-0",
          side === "end"
            ? "start-full top-1/2 ms-2 -translate-y-1/2"
            : "bottom-full left-1/2 mb-2 -translate-x-1/2"
        )}>
        {label}
      </span>
    </span>
  );
}
