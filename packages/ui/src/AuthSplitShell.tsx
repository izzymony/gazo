import { ReactNode } from "react";
import { cn } from "@vibaar/utils";

interface AuthSplitShellProps {
  /** Artwork: a full-bleed band above the content on mobile, the left pane at `md`. */
  media: ReactNode;
  /** The content column. */
  children: ReactNode;
  /** Pinned to the viewport bottom below `md`; flows in the column at `md`. */
  footerAction?: ReactNode;
  /** Escape hatch for the band. The height is the shell's own — see below. */
  mediaClassName?: string;
  /** Extra classes for the content column's inner wrapper. */
  contentClassName?: string;
}

/**
 * AuthSplitShell — the two-pane frame behind /signin, /signup and /welcome.
 *
 * This frame existed twice before this component did, inlined in SignInOverview
 * and SignUpOverview, and the two copies had already drifted: signin's content
 * column carried `gap-4` and signup's did not, so the same screen sat 16px
 * apart depending on which URL you arrived at.
 *
 * Worse, each copy split mobile from desktop into two sibling subtrees under
 * `md:hidden` / `hidden md:flex`. Both always mounted, so every signed-out visit
 * ran two independent slideshow engines and fetched all three slide backgrounds
 * twice, each with `priority`. This renders ONE tree and lets CSS place it —
 * which is why `footerAction` is positioned rather than duplicated across a
 * breakpoint pair below.
 *
 * It is a second lean shell rather than a flag on PageShell, per the guardrail
 * in SYSTEMISATION-STANDARD.md: PageShell is single-column by construction and
 * `isAuth`-shaped props on it are the documented smell. This owns only frame
 * concerns — the panes, the gutters, the action bar's position — and knows
 * nothing about slideshows, auth state or onboarding.
 */
export default function AuthSplitShell({
  media,
  children,
  footerAction,
  mediaClassName,
  contentClassName,
}: AuthSplitShellProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col min-h-dvh",
        // `min-h-dvh`, not `min-h-screen`: the root is `h-dvh overflow-hidden`
        // wrapping an `h-full overflow-y-auto` scroller, so a `100vh` frame
        // disagrees with its own container under mobile Safari's URL bar.
        "md:mx-auto md:max-w-7xl md:flex-row md:gap-8 md:px-6 md:py-6 lg:px-8"
      )}>
      <div
        className={cn(
          "relative w-full shrink-0 overflow-hidden",
          // The band height is the shell's, not the caller's. It was a required
          // prop, and the three callers promptly disagreed — 38vh/42vh on
          // welcome against a fixed 240px/500px on the two auth screens, so the
          // same band measured 240px on one and 321px on another at one width.
          // Viewport-relative, so it keeps its share of a short phone and a
          // tall one rather than a fixed band that swallows the first.
          "h-auth-band sm:h-auth-band-wide md:h-auto",
          // Both panes are `w-1/2` with a gap between them, which over-commits
          // the row by exactly the gap — the columns then shrink to fit, and
          // that shrink is what produces their real width. Restoring
          // shrinkability at `md` is therefore load-bearing, not tidying.
          "md:w-1/2 md:shrink md:rounded-panel md:shadow-pop",
          mediaClassName
        )}>
        {media}
      </div>

      <div className="flex flex-1 flex-col px-4 md:w-1/2 md:flex-initial md:items-center md:justify-center md:px-8">
        <div
          className={cn(
            "mx-auto flex w-full max-w-md flex-col gap-4",
            // Clear the action bar, which leaves the flow once it is pinned.
            footerAction && "pb-20 md:pb-0",
            contentClassName
          )}>
          {children}

          {footerAction && (
            <div
              className={cn(
                "fixed inset-x-0 bottom-0 z-sticky border-t border-outline bg-surface px-4 pb-3",
                "md:static md:border-0 md:bg-transparent md:p-0"
              )}>
              {footerAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
