import { ReactNode } from "react";
import { cn } from "@vibaar/utils";

export interface InlineActionRowProps {
  /** The action(s). Secondary first, primary last — see below. */
  children?: ReactNode;
  /** Optional status/context rendered opposite the actions at lg. */
  status?: ReactNode;
  className?: string;
}

/**
 * InlineActionRow — the constrained, right-aligned desktop action row.
 *
 * "Inline" does not mean full-width and does not mean centred. A page action
 * stretched across a 1280px column, or floated in the middle of it, is the
 * desktop equivalent of the viewport-fixed bar this work removes.
 *
 * Renders NOTHING when there is no action. `payouts/details` passes `undefined`
 * for every non-refund transaction, and an empty constrained row would ship a
 * stray 44px gap on each of them.
 *
 * `lg:[&>*]:min-w-action` is the 176px inline floor (mid the 160–200px band).
 * Variant order matters: `[&>*]:lg:` emits NOTHING — the responsive variant
 * must be outermost. Verified against the generated stylesheet, not assumed. It is
 * applied HERE and not on the button, because the floor is a property of the
 * inline placement: a header action must stay compact and a dialog button must
 * stay intrinsic.
 *
 * Order is DOM order: secondary before primary. That reads correctly
 * left-to-right in both the mobile stack and the desktop row, so no breakpoint
 * ever reverses it.
 */
export default function InlineActionRow({ children, status, className }: InlineActionRowProps) {
  if (!children && !status) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        "lg:flex-row lg:items-center lg:gap-3",
        status ? "lg:justify-between" : "lg:justify-end",
        "lg:[&>*]:min-w-action",
        className
      )}>
      {status ? <div className="lg:shrink-0">{status}</div> : null}
      {children ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">{children}</div>
      ) : null}
    </div>
  );
}
