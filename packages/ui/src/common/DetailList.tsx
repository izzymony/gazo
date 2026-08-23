import { ReactNode } from "react";
import { cn } from "@vibaar/utils";

interface DetailListProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function DetailList({ title, children, className }: DetailListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && <p className="text-body-sm font-medium text-ink-40 uppercase tracking-wide">{title}</p>}
      {children}
    </div>
  );
}
