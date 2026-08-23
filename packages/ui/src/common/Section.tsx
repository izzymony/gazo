import { ReactNode } from "react";
import { cn } from "@vibaar/utils";

interface SectionProps {
  children: ReactNode;
  /** Optional label rendered above the content. */
  title?: string;
  className?: string;
}

/**
 * Section — a (optionally titled) vertical stack with consistent rhythm
 * (design-system content layer).
 *
 * Replaces the per-page `space-y-2` / `space-y-4` drift with one gap
 * (`space-y-3`) and standardises the "label + list" pattern so a section
 * on one screen matches a section on another.
 */
export default function Section({ children, title, className }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {title && <p className="text-body font-medium text-ink-90">{title}</p>}
      {children}
    </section>
  );
}
