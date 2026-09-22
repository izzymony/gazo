"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@vibaar/utils";
import { focusRing, focusRingInset } from "../styles";
import { ChevronDown } from "../icons";

interface DropdownSelectProps {
  options: string[];
  /** The chosen option. */
  value: string;
  onSelect: (option: string) => void;
  /** Shown when nothing is chosen yet. */
  placeholder?: string;
  /** Accessible name for the trigger, e.g. "Sort order". */
  ariaLabel?: string;
  className?: string;
}

/**
 * DropdownSelect — a compact pill that chooses one of a short list.
 *
 * The catalog's "ascending" and analytics' "Today" are this control. It lived
 * in `features/seller-shell` as a local component, so it was invisible to the
 * design system and never got the treatment the rest of the primitives did:
 * the options were `<li onClick>` — not focusable, no `role`, ignoring Enter
 * and Space — the trigger announced no expanded state, Escape did nothing,
 * clicking away did nothing, and `py-1` made it a 24px control, well under the
 * 36px touch floor every other control in the system holds.
 *
 * This is a listbox: the trigger owns `aria-haspopup`/`aria-expanded`, each
 * option is a real `role="option"` button carrying `aria-selected`, Escape
 * closes and returns focus, and a click outside closes it.
 */
export default function DropdownSelect({
  options,
  value,
  onSelect,
  placeholder = "Select",
  ariaLabel,
  className,
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={cn("relative inline-block text-left", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          // min-h-9 is the shared touch floor — the same one Button `sm`,
          // IconButton `md`, Switch and ChipToggle hold.
          "inline-flex min-h-9 items-center gap-2 rounded-pill bg-surface-subtle px-3",
          "text-body-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-muted",
          focusRing
        )}>
        <span className="capitalize">{value || placeholder}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn("transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          // The list used to carry px-4 AND each row px-2 — double padding on
          // every option.
          className="absolute left-0 z-dropdown mt-1 min-w-full overflow-hidden rounded-field bg-surface py-1 shadow-pop">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full min-h-9 items-center whitespace-nowrap px-3 text-left text-body-sm capitalize",
                  "transition-colors hover:bg-surface-muted",
                  option === value
                    ? "font-medium text-foreground-primary"
                    : "text-foreground-secondary",
                  focusRingInset
                )}>
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
