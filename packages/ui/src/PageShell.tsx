import { ReactNode, Ref } from "react";
import { cn } from "@vibaar/utils";

interface PageShellProps {
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
      : "w-full max-w-full lg:max-w-5xl lg:mx-auto";

  return (
    <>
      {!hero && header}
      <div className={cn("flex flex-col h-full", container)}>
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
                  ? "fixed left-shell-inset right-0 lg:w-auto"
                  : "sticky"
              )}>
              {footerAction}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
