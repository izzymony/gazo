"use client";

import React, { useEffect, useRef, useState } from "react";
import { focusRing, focusRingInset } from "../styles";
import { BsThreeDots } from "../icons";

interface Option {
  label: string;
  onClick: () => void;
}

interface DropdownMenuProps {
  options: Option[];
  /** Accessible name for the trigger. */
  ariaLabel?: string;
}

/**
 * Kebab menu — a trigger and a list of actions.
 *
 * The trigger used to be the ICON itself with an onClick on the <svg>: not
 * focusable, not keyboard-operable, and announcing nothing. It is a real
 * <button> now, with aria-haspopup/aria-expanded, and the list carries
 * role="menu"/"menuitem". Escape closes and returns focus to the trigger.
 * Nothing visual changed.
 */
const DropdownMenu: React.FC<DropdownMenuProps> = ({ options, ariaLabel = "Open menu" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Click outside closes. Stop the trigger's own click bubbling to any
  // clickable ancestor (e.g. a selectable card) so opening can't activate it.
  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`absolute top-1 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full ${focusRing}`}>
        <BsThreeDots size={18} />
      </button>

      {isOpen && (
        <ul role="menu" className="absolute right-0 z-dropdown mt-5 w-40 rounded-lg border border-outline bg-surface text-body-sm shadow-pop">
          {options.map((option, index) => (
            <li key={index} role="none">
              <button
                type="button"
                role="menuitem"
                className={`w-full px-4 py-2 text-left hover:bg-surface-subtle ${focusRingInset}`}
                onClick={(event) => {
                  event.stopPropagation();
                  option.onClick();
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownMenu;
