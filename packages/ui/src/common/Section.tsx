import { ReactNode, useId } from "react";
import { cn } from "@vibaar/utils";

interface SectionProps {
  children: ReactNode;
  /** Optional label rendered above the content, as a real heading. */
  title?: ReactNode;
  /**
   * Heading level for `title`. A page's sections are usually h2; nest deeper
   * only where the document structure genuinely warrants it.
   */
  titleAs?: "h2" | "h3" | "h4";
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
export default function Section({
  children,
  title,
  titleAs: Heading = "h2",
  className,
}: SectionProps) {
  const titleId = useId();

  return (
    <section
      className={cn("space-y-3", className)}
      // A <section> is only a landmark when it has an accessible name. Without
      // this the element was a bare container and the title was a <p>, so 29
      // screens exposed no section structure at all.
      aria-labelledby={title ? titleId : undefined}>
      {title && (
        <Heading id={titleId} className="text-body font-medium text-foreground-primary">
          {title}
        </Heading>
      )}
      {children}
    </section>
  );
}
