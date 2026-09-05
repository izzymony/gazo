import React, { useState, ReactNode } from "react";
import { GoChevronDown } from "../icons";
import { cn } from "@vibaar/utils";

interface AccordionProps {
  title: string;
  className?: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  className,
  children,
  initiallyOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className={className}>
      <button
        type="button"
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
      </button>
      {isOpen && <div className="space-y-4 mt-3">{children}</div>}
    </div>
  );
};

export default Accordion;
