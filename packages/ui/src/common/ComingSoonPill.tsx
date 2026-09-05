import React from 'react';
import { cn } from "@vibaar/utils";

interface ComingSoonPillProps {
  className?: string;
}

const ComingSoonPill: React.FC<ComingSoonPillProps> = ({ className = '' }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border border-info-border bg-info-surface px-2 py-0.5 text-body-sm font-medium text-info-foreground",
        className
      )}
    >
      Soon
    </span>
  );
};

export default ComingSoonPill;
