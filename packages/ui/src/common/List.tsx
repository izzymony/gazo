import { ReactNode } from "react";
import { cn } from "@vibaar/utils";

/**
 * List — the container ListItem rows belong in.
 *
 * A stack of ListItems was a stack of divs, so nothing announced "list, 5
 * items" or let a screen reader jump between rows. ListItem cannot fix that
 * alone: list semantics live on the container. This is that container.
 *
 * `role="list"` is set explicitly because a `list-style: none` <ul> loses its
 * implicit list role in Safari + VoiceOver, and every list in this app is
 * unstyled.
 */
export default function List({
  children,
  label,
  className,
}: {
  children: ReactNode;
  /** Accessible name, e.g. "Recent orders". */
  label?: string;
  className?: string;
}) {
  return (
    <ul role="list" aria-label={label} className={cn("divide-y divide-outline-subtle", className)}>
      {children}
    </ul>
  );
}
