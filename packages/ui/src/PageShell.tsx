import { ReactNode, Ref } from "react";
import { cn } from "@vibaar/utils";
import PageHeaderBand, { type PageHeaderSpec } from "./PageHeaderBand";

interface PageShellBaseProps {
  /** Header element (BackHeader / StepHeader / etc.). It positions itself
   *  (absolute on mobile, sticky on lg), so the shell offsets content for it. */
  header?: ReactNode;
  /** Full-bleed brand hero region (HeroHeader) rendered at the very top of the
   *  scroll area. When set it replaces `header`, owns the top edge (no offset),
   *  and the page content below it still gets the standard px + 24px rhythm. */
  hero?: ReactNode;
  /** Content for the fixed bottom action bar (buttons). When present, the
   *  scroll region gets bottom padding so content isn't hidden behind it. */
  footerAction?: ReactNode;
  /** `fixed` pins the action to the viewport; `contained` keeps it inside a
   * composed shell. Default `fixed` preserves the application layout. */
  footerPosition?: "fixed" | "contained";
  children: ReactNode;
  /** Container width. `standard` = the app's max-w-5xl column; `full` = full-bleed
   *  (marketing). Default `standard`. */
  width?: "standard" | "full";
  /** Vertical alignment of content within the scroll region. Default `top`. */
  align?: "top" | "center";
  /** Extra classes for the scroll region (rare — prefer keeping pages clean). */
  contentClassName?: string;
  /** Exposes the scroll node so scroll-driven UIs (storefront collapse-on-scroll)
   *  can read it. When set, the shell does NOT own scroll behaviour beyond it. */
  scrollRef?: Ref<HTMLElement>;
}

/**
 * `header` and `pageHeader` are mutually exclusive, enforced by the type system
 * rather than a runtime throw: a dev-time throw only fires on the code path
 * someone happens to render, while `never` rejects both-at-once at compile time
 * on every screen at once.
 *
 * `header` stays exactly as it was for the ~48 screens that carry no flow
 * action. `pageHeader` is for the ones that do — it hands the shell the header
 * AND the action together, which is the only way one component can place a
 * single action node in the header row at `lg` and in the bottom bar below it.
 */
type PageShellProps = PageShellBaseProps &
  (
    | { header?: ReactNode; pageHeader?: never }
    | { pageHeader: PageHeaderSpec; header?: never }
  );

/**
 * PageShell — the single systematic page layout (W3.7 / layout systematization).
 *
 * OWNS the shell concerns that were previously hand-set (and inconsistent) on
 * every screen: the max-w-5xl container, the header-offset (`mt-11 lg:mt-0` —
 * needed because Header is absolute on mobile), horizontal padding
 * (`px-4 lg:px-5`), the scroll region, and the de-duplicated fixed action bar.
 *
 * Pages pass a `header`, optional `footerAction`, and their CONTENT ONLY — no
 * more per-page `mt-11`/`mt-[40px]`/`px-*`. Nav is NOT here; it belongs to the
 * route-group layout ((buyer)/(seller)/(auth)), orthogonal to structure.
 */
export default function PageShell({
  header,
  pageHeader,
  hero,
  footerAction,
  footerPosition = "fixed",
  children,
  width = "standard",
  align = "top",
  contentClassName,
  scrollRef,
}: PageShellProps) {
  const container =
    width === "full"
      ? "w-full"
      : // `rail-safe-foreground` is inert unless a shell declares an obstruction,
        // and adds only the clearance actually missing — at 1280 and above the
        // centred column already clears a rail, so it adds nothing there.
        "w-full max-w-full lg:max-w-5xl lg:mx-auto rail-safe-foreground";

  // A flow page: the band owns the header, the content and the single action
  // tree, because placing one node in two positions requires one owner.
  if (pageHeader) {
    return (
      <PageHeaderBand {...pageHeader} contentClassName={contentClassName} scrollRef={scrollRef}>
        {children}
      </PageHeaderBand>
    );
  }

  return (
    // The header and the column are wrapped in one flex column, and the column
    // takes `flex-1` rather than `h-full`.
    //
    // `h-full` was wrong at lg and had been invisible: below lg the header is
    // `absolute` and contributes no flow height, so 100% is right; at lg it is
    // `sticky`, so it takes ~68px of flow ABOVE a sibling asking for the full
    // 100% — and the column ran 68px past the viewport, into the shell's
    // `overflow-hidden`. Nothing showed it while the action bar was `fixed`,
    // because a fixed bar is positioned against the viewport and does not care
    // what its container's height is. The moment the bar joins the flow, the
    // last 68px of it is clipped.
    <div className="flex flex-col h-full">
      {!hero && header}
      <div className={cn("flex flex-col flex-1 min-h-0", container)}>
        <div className="flex flex-col h-full">
          <main
            ref={scrollRef}
            className={cn(
              "flex-1 overflow-y-auto scrollbar-hide",
              // Standard (non-hero) pages own their padding, header-offset, and
              // 24px block rhythm directly on the scroll region. Hero pages move
              // those onto the padded content wrapper below the full-bleed hero.
              !hero && width === "standard" && "px-4 lg:px-5",
              // Clear the header (~48px on mobile: absolute) AND give a
              // consistent ~16px breathing gap below it — mobile mt-16,
              // desktop mt-4 below the sticky header.
              !hero && header && "mt-16 lg:mt-4",
              // Consistent 24px vertical rhythm between top-level blocks.
              !hero && "space-y-6",
              // Keep content clear of the fixed action bar.
              !hero && footerAction && "pb-24",
              align === "center" &&
                "flex flex-col items-center justify-center",
              contentClassName
            )}>
            {hero ? (
              <>
                {hero}
                <div
                  className={cn(
                    "px-4 lg:px-5 pt-6 space-y-6",
                    footerAction && "pb-24"
                  )}>
                  {children}
                </div>
              </>
            ) : (
              children
            )}
          </main>

          {footerAction && (
            <div
              className={cn(
                "bottom-0 w-full max-w-full border-t border-outline-subtle bg-surface px-3 pb-5 z-sticky lg:mx-auto lg:max-w-5xl",
                // THE DESKTOP FALLBACK. Screens classified `header` pass
                // `pageHeader` and never reach this branch. What is left is
                // everything that keeps a bar: the inline screens until each is
                // migrated, the three invalid auth states that fall through to
                // this shell and may not be edited individually, and — the case
                // that makes this load-bearing rather than tidying — every
                // route-backed dialog opened by direct URL or hard refresh,
                // which renders its canonical page instead of the dialog.
                //
                // At lg the bar stops being a bar: out of fixed positioning, no
                // top rule, and the action constrained and pushed right by the
                // wrapper below. Below lg not one property changes.
                "lg:border-t-0 lg:px-5 lg:pb-6",
                // `left-shell-inset` is 0 unless a shell declares otherwise, so this
                // is unchanged everywhere except inside one that does — today, the
                // seller dashboard, whose desktop rail it has to clear.
                //
                // `lg:w-auto` is load-bearing, not tidying. With a non-zero inset,
                // `left` + `right` + `w-full` is over-constrained, so CSS drops
                // `right` and the bar keeps its full width from an indented left
                // edge — hanging 256px off the side of a 1024px viewport. Letting
                // the width fall out of the remaining space is what keeps both
                // edges honest.
                footerPosition === "fixed"
                  ? "fixed left-shell-inset right-0 lg:static lg:w-full"
                  : "sticky"
              )}>
              {/* `contents` below lg so this wrapper has no box at all there and
                  the mobile bar is untouched; a real box at lg, right-aligned by
                  `ml-auto`, floored at the 176px inline minimum and capped so a
                  `w-full` Button inside an unmigrated screen is bounded instead
                  of spanning the column. */}
              <div className="contents lg:block lg:ml-auto lg:w-fit lg:min-w-action lg:max-w-sm">
                {footerAction}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
