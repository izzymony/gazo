"use client";

import React, { useId, useState, ReactNode } from "react";
import { GoChevronDown } from "../icons";
import { cn } from "@vibaar/utils";
import DisclosureButton from "./DisclosureButton";

interface AccordionProps {
  title: string;
  /**
   * A summary of what is inside, shown in the header row beside the title —
   * a rating and its count, an item count, a total.
   *
   * Without it, a section's headline fact had to be repeated as the first row
   * INSIDE the section, which is where the product page's "★★★★★ 5.0 · 4
   * reviews" line sat: a second header under the header.
   */
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

/**
 * Accordion — a titled section that expands and collapses.
 *
 * The trigger is a DisclosureButton, so the four screens that import this get
 * `aria-expanded`, `aria-controls` and a focus ring without changing a line.
 * Before this the header was a bare <button> with none of them — the same
 * defect the hand-rolled section headers had, just inside the shared
 * component instead of beside it.
 */
const Accordion: React.FC<AccordionProps> = ({
  title,
  meta,
  className,
  children,
  initiallyOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const panelId = useId();

  return (
    <div className={className}>
      {/* py-4 on the trigger, not a bare min-height.
          Collapsed, an accordion IS its header row, so that row's padding is the
          whole section's rhythm. With only `min-h-[36px]` the text sat flush
          against its own divider and a stack of collapsed sections read as one
          dense block. 16px above and below gives a 52px row — the same height as
          the compact header and comfortably over the 36px touch minimum. */}
      <DisclosureButton
        expanded={isOpen}
        controls={panelId}
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-4 text-body font-medium text-foreground-primary">
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="shrink-0">{title}</span>
          {meta && (
            <span className="flex min-w-0 items-center gap-2 font-normal">{meta}</span>
          )}
        </span>
        <GoChevronDown
          size={20}
          className={cn(
            "flex-shrink-0 transition-transform text-foreground-secondary",
            isOpen && "rotate-180"
          )}
        />
      </DisclosureButton>
      {/* The trigger already owns the space above; the panel only needs the gap
          under itself so an open section does not crowd the next divider. */}
      {isOpen && (
        <div id={panelId} className="space-y-4 pb-5">
          {children}
        </div>
      )}
    </div>
  );
};

export default Accordion;
