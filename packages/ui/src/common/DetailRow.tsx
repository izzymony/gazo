import { ReactNode } from "react";
import { cn } from "@vibaar/utils";

interface DetailRowProps {
  label: string;
  /** Plain value text (rendered emphasized). Ignored if `children` is passed. */
  value?: ReactNode;
  /** Custom value node (e.g. a status pill). Overrides `value`. */
  children?: ReactNode;
  className?: string;
}

// Label is secondary (text-foreground-secondary), value is primary/emphasized (font-medium
// text-foreground-primary) so the row has hierarchy.
export default function DetailRow({ label, value, children, className }: DetailRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <p className="text-body-sm text-foreground-secondary">{label}</p>
      {children ?? <p className="text-body font-medium text-foreground-primary text-right">{value}</p>}
    </div>
  );
}
