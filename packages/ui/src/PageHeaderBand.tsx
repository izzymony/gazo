import { ReactNode, Ref } from "react";
import { cn } from "@vibaar/utils";
import HeaderRow from "./common/HeaderRow";

export interface PageHeaderSpec {
  onBack?: () => void;
  leading?: ReactNode;
  title?: ReactNode;
  /** Existing header controls — a bell, a kebab, a help link. NOT the flow action. */
  trailing?: ReactNode;
  /** `StepNavigation` on wizard flows. Rendered in its own full-span row. */
  progress?: ReactNode;
  /** A compact indicator opposite the action at lg — "Unsaved changes". */
  status?: ReactNode;
  /** THE flow action. Rendered exactly once, placed responsively. */
  actions?: ReactNode;
}

interface PageHeaderBandProps extends PageHeaderSpec {
  children: ReactNode;
  contentClassName?: string;
  scrollRef?: Ref<HTMLElement>;
}

/**
 * PageHeaderBand — the desktop page frame for screens that own a flow action.
 *
 * THE PROBLEM IT SOLVES. On a phone the primary action belongs at the bottom,
 * under the thumb. On a desktop that puts "Save" a thousand pixels below the
 * field you just filled, and stretches one button across a 1024px column. But
 * the header and the action bar live in different DOM subtrees, and CSS cannot
 * move a node between subtrees — so the naive fixes are to duplicate the button
 * or to pick a slot with a media-query hook. Both were rejected: duplication
 * makes the hidden copy the implicit form-submit default and leaves two states
 * to keep in sync; a hook turns a layout primitive into a client component and
 * flashes the wrong layout on first paint.
 *
 * WHAT THIS DOES INSTEAD. One action node, last in the DOM, lifted into the
 * header's row at `lg` by GRID PLACEMENT. Grid placement is independent of
 * source order, so the action can be a real cell in row 1 while remaining after
 * `<main>` for focus and screen-reader order.
 *
 * That distinction is the whole design. An earlier attempt positioned the
 * action absolutely over the header band: it shared the header's COORDINATES
 * but not its LAYOUT CALCULATION, so the title had nothing to yield to and a
 * long one ran underneath a wide action group. Here the action occupies an
 * `auto` track, the title's column is `minmax(0,1fr)`, and the title truncates
 * against the space that genuinely remains.
 *
 * FOCUS ORDER, STATED PLAINLY. Exactly-once placement cannot preserve both
 * mobile focus order and desktop visual order — tab order follows DOM, and one
 * node has one position. Keeping the action after `<main>` makes mobile a
 * perfect match, and at `lg` the action is visually top-right but the last tab
 * stop. That is exactly what the desktop does today behind the bottom bar, so
 * nobody regresses; only the pixels move.
 *
 * BELOW `lg` NOTHING HERE APPLIES. The band and the action wrapper are
 * `lg:contents`, which removes only their layout boxes — so the mobile render
 * is the same absolute header and the same fixed bottom bar as before, in the
 * same DOM order, with the same accessible behaviour.
 */
export default function PageHeaderBand({
  onBack,
  leading,
  title,
  trailing,
  progress,
  status,
  actions,
  children,
  contentClassName,
  scrollRef,
}: PageHeaderBandProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col h-full w-full max-w-full bg-surface rail-safe-foreground",
        // `bg-surface` is deliberate and NOT redundant with the root, which also
        // paints it — deleting this changes nothing today, which is the trap. A
        // layout primitive paints its own surface rather than inheriting one
        // from a distant ancestor it cannot see. Locality, not a theme rescue.
        "lg:mx-auto lg:max-w-5xl lg:grid lg:gap-x-3 lg:px-5 lg:pt-5",
        "lg:grid-rows-page-band",
        status ? "lg:grid-cols-page-band-status" : "lg:grid-cols-page-band"
      )}>
      {/* Mobile: the absolute header band, unchanged. At lg it dissolves so its
          children become grid cells in their own rows. */}
      <div className="absolute inset-x-0 top-0 z-sticky w-full bg-surface px-4 pt-3 lg:contents">
        <HeaderRow
          onBack={onBack}
          leading={leading}
          title={title}
          trailing={trailing}
          className="lg:col-start-1 lg:row-start-1 lg:self-center"
        />
        {progress ? <div className="lg:col-span-full lg:row-start-2">{progress}</div> : null}
      </div>

      <main
        ref={scrollRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 lg:px-0 space-y-6",
          // Clear the mobile header (absolute) and the mobile action bar.
          "mt-16 lg:mt-4",
          actions || status ? "pb-24 lg:pb-6" : undefined,
          "lg:col-span-full lg:row-start-3",
          contentClassName
        )}>
        {children}
      </main>

      {/* THE ONE ACTION TREE — last in the DOM, lifted into row 1 at lg.
          Mobile: byte-for-byte the action bar PageShell renders today. */}
      {actions || status ? (
        <div
          className={cn(
            "fixed left-shell-inset right-0 bottom-0 w-full border-t border-outline-subtle",
            "bg-surface px-3 pb-5 z-sticky",
            "lg:contents"
          )}>
          {status ? (
            <div className="mb-2 lg:mb-0 lg:col-start-2 lg:row-start-1 lg:self-center lg:shrink-0">
              {status}
            </div>
          ) : null}
          {actions ? (
            <div
              className={cn(
                "lg:row-start-1 lg:self-center lg:flex lg:items-center lg:gap-3 lg:shrink-0 whitespace-nowrap",
                status ? "lg:col-start-3" : "lg:col-start-2"
              )}>
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
