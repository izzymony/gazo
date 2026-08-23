import { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

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
  scrollRef?: Ref<HTMLDivElement>;
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
              !hero && footerAction && "pb-[100px]",
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
                    footerAction && "pb-[100px]"
                  )}>
                  {children}
                </div>
              </>
            ) : (
              children
            )}
          </main>

          {footerAction && (
            <div className="fixed bottom-0 left-0 right-0 w-full max-w-full lg:max-w-5xl lg:mx-auto pb-5 px-3 bg-white border-t border-gray-100 z-sticky">
              {footerAction}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
