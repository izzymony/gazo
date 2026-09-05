"use client";

import React, { useId, useState, ReactNode } from "react";
import { GoChevronDown } from "../icons";
import { cn } from "@vibaar/utils";
import DisclosureButton from "./DisclosureButton";

interface AccordionProps {
  title: string;
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
  className,
  children,
  initiallyOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const panelId = useId();

  return (
    <div className={className}>
      <DisclosureButton
        expanded={isOpen}
        controls={panelId}
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full text-body font-medium text-foreground-primary min-h-[36px]">
        {title}
        <GoChevronDown
          size={20}
          className={cn(
            "flex-shrink-0 transition-transform text-foreground-secondary",
            isOpen && "rotate-180"
          )}
        />
      </DisclosureButton>
      {isOpen && (
        <div id={panelId} className="space-y-4 mt-3">
          {children}
        </div>
      )}
    </div>
  );
};

export default Accordion;
