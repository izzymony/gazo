"use client";

import { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

export type SelectableCardTone = "default" | "dashed";

export interface SelectableCardProps {
  children: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  /**
   * `dashed` is the empty-slot form — an upload target or an "add another"
   * placeholder, where the dashed edge says something belongs here and does
   * not yet.
   */
  tone?: SelectableCardTone;
  /**
   * Accessible name, when the card's own content does not read as one — an
   * upload target whose visible text is just an icon and a hint, say.
   */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * SelectableCard — a bordered card that is one option among several.
 *
 * The KYC document picker, the shipping-method chooser, the storefront theme
 * picker and the upload targets each hand-rolled this: a bordered box whose
 * border and background change when chosen. Fourteen or so of them, and none
 * announced that it was selectable or which one was selected — the state lived
 * entirely in a border colour.
 *
 * It renders a real button carrying `aria-pressed`, because choosing one of a
 * set is a toggle, not navigation. Where the choice is exclusive AND drives a
 * form value, prefer `RadioGroup` — it gives arrow-key roving between options,
 * which a row of independent buttons cannot.
 */
export default function SelectableCard({
  children,
  selected = false,
  onSelect,
  tone = "default",
  ariaLabel,
  disabled = false,
  className,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "w-full rounded-card border p-3 text-left transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none",
        focusRing,
        tone === "dashed" && "border-dashed",
        selected
          ? "border-brandDeep bg-brand/5"
          : "border-outline hover:border-outline-strong hover:bg-surface-subtle",
        className
      )}>
      {children}
    </button>
  );
}
