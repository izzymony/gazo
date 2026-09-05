"use client";

import { cn } from "@vibaar/utils";

interface StoreStatusBadgeProps {
  isActive?: boolean;
  className?: string;
}

const StoreStatusBadge = ({ 
  isActive = true, 
  className = "" 
}: StoreStatusBadgeProps) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div 
        className={`w-2 h-2 rounded-full ${
          isActive ? 'bg-success-foreground' : 'bg-foreground-disabled'
        }`}
      />
      <span className={`text-caption font-medium ${
        isActive ? 'text-success-foreground' : 'text-foreground-muted'
      }`}>
        {isActive ? 'Live' : 'Inactive'}
      </span>
    </div>
  );
};

export default StoreStatusBadge;
