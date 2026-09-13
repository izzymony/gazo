"use client";

import { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import useMediaActive from "./common/useMediaActive";

/** Where the artwork is shown. */
export type AuthSplitMedia =
  /** Both widths: a band above the content on mobile, the right pane at `md`. */
  | "always"
  /** Desktop only: absent from mobile visually AND structurally. */
  | "desktop";

/** Which action bar the screen wants below `md`. */
export type AuthSplitAction =
  /** The landing bar — welcome and step zero. */
  | "landing"
  /** A progressive form step: PageShell's bar, to the pixel. */
  | "step";

interface AuthSplitShellProps {
  /** Artwork. Decorative — the pane is `aria-hidden`. */
  media: ReactNode;
  /** The content column: form, actions, copy. */
  children: ReactNode;
  /** A step header (back, brand, progress). Rendered above the column. */
  header?: ReactNode;
  /** Pinned to the viewport bottom below `md`; flows in the column at `md`. */
  footerAction?: ReactNode;
  mediaOn?: AuthSplitMedia;
  actionMode?: AuthSplitAction;
  /** Extra classes for the content column's inner wrapper. */
  contentClassName?: string;
}

/**
 * AuthSplitShell — the two-pane frame behind /welcome, /signin and /signup.
 *
 * This frame existed twice before this component did, inlined in SignInOverview
 * and SignUpOverview, and the two copies had already drifted: signin's content
 * column carried `gap-4` and signup's did not, so the same screen sat 16px
 * apart depending which URL you arrived at. Each copy also split mobile from
 * desktop into two sibling subtrees under `md:hidden` / `hidden md:flex`, both
 * always mounted, so every signed-out visit ran two slideshow engines and
 * fetched all three backgrounds twice with `priority`.
 *
 * So: ONE tree, placed by CSS. That is why `footerAction` is positioned rather
 * than duplicated across a breakpoint pair, and why `mediaOn` gates a mount
 * rather than a `hidden` class.
 *
 * ## Content is first in the DOM, and that is not the visual order
 *
 * The form leads the document so reading and tab order start at the thing you
 * came to do; the artwork follows and is `aria-hidden`. On mobile in `always`
 * mode the artwork must still appear ABOVE the content, so the order is
 * reversed visually with `order-*`.
 *
 * `order` only works on a flex/grid child, and a `display: contents` parent
 * promotes its children to the GRANDparent's formatting context — so the two
 * media modes need genuinely different mobile frames, not one class string:
 *
 *   always   frame is a real `flex flex-col`; media `order-first`
 *   desktop  frame collapses to `contents`; media is not rendered at all,
 *            so there is nothing to order and the column lays out directly
 *            against the app scroller, exactly as PageShell did
 *
 * ## It is a second lean shell, not a flag on PageShell
 *
 * Per SYSTEMISATION-STANDARD.md: PageShell is single-column by construction and
 * `isAuth`-shaped props on it are the documented smell. This owns only frame
 * concerns and knows nothing about slideshows, auth state or step machines.
 */
export default function AuthSplitShell({
  media,
  children,
  header,
  footerAction,
  mediaOn = "always",
  actionMode = "landing",
  contentClassName,
}: AuthSplitShellProps) {
  // Resource lifecycle, NOT layout: in `desktop` mode the artwork is three slide
  // backgrounds, nine floating cards and a running animation loop that a phone
  // will never see on a form step. `hidden` would keep every byte downloading.
  // In `always` mode it is never consulted, so that artwork still server-renders
  // — welcome's hero is above the fold and `priority`.
  const desktopActive = useMediaActive("md");
  const showMedia = mediaOn === "always" || desktopActive;

  const isStep = actionMode === "step";

  return (
    <div
      className={cn(
        // `contents` lets the step body lay out against the app's own scroller
        // below `md`, so its mobile frame is unchanged by construction rather
        // than by re-tuning. `always` needs a real box to order the band.
        mediaOn === "always" ? "flex min-h-dvh w-full flex-col" : "contents",
        // No `max-w-*`: a cap here is exactly what froze the media pane at
        // 592px from 1280 up. The content column carries the readable width
        // instead, and the media takes the surplus.
        //
        // `md:w-full` is load-bearing, not tidying. The app scroller is a
        // `flex flex-col items-center`, so a grid that does not claim a width
        // shrink-wraps its content: the `1fr` media track resolved to 0px and
        // the pane rendered zero-wide. `always` never hit it because its mobile
        // frame already carries `w-full`; `contents` has no box to carry one.
        "md:grid md:w-full md:h-dvh md:grid-cols-2 md:gap-8 md:p-6",
        // 40/60 from `lg`. Proportional rather than "content clamps, media
        // takes the rest": that version pinned the column at 448px, so every
        // pixel past 1280 went to the artwork and the form sat in a narrow strip
        // against a growing picture. Splitting the space keeps both growing, and
        // the column's extra width becomes whitespace around the content rather
        // than wider fields — the inner wrapper is still capped at `max-w-md`.
        //
        // `minmax(0,...)` on both tracks: a bare `2fr` floors at min-content, so
        // a long unbroken string in the form would push the media pane narrower
        // than its share instead of wrapping.
        "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:p-8"
      )}>
      <div
        className={cn(
          "flex w-full flex-col",
          // Mobile: `always` sits below the band in a flex frame; `step` is a
          // direct child of the app scroller and owns the full height, which is
          // what PageShell's `flex flex-col h-full` root did.
          mediaOn === "always" ? "order-last flex-1" : "h-full",
          // Desktop: its own scrollport, so a short window scrolls the form
          // rather than the page — and the media pane cannot be pushed taller.
          // `items-center` is what lets the header and the content share one
          // measure: without it the header spanned the whole column while the
          // content sat capped and centred, so their edges drifted apart as the
          // column grew — 61px at 1680.
          "md:order-none md:h-full md:min-h-0 md:items-center md:overflow-y-auto md:px-8"
        )}>
        {/* Header and content travel together at `md`, as one centred group.
            Centring only the form left the progress bar stranded at the top of
            a tall column with a void beneath it — two disconnected pieces
            rather than one screen.

            `contents` below `md`: the group evaporates, so the header stays
            `absolute` against the column and the body keeps the full height,
            exactly as it did inside PageShell. */}
        <div
          className={cn(
            "contents",
            "md:my-auto md:flex md:w-full md:max-w-md md:flex-col"
          )}>
          {header}

          <div
          className={cn(
            // The group above owns the vertical centring; this owns the
            // measure. `my-auto` here would fight it.
            "mx-auto flex w-full max-w-md flex-col",
            isStep
              ? // PageShell's mobile content frame, to the pixel: its gutter,
                // its header offset, its 24px rhythm. The offset is mobile-only
                // because the header is only `absolute` there.
                //
                // `flex-1` restores the height chain these steps were written
                // against. Inside PageShell they sat in a `flex-1` <main>, so a
                // step body's `h-full` resolved and its `mt-auto` pushed the
                // secondary link down to just above the action bar. Without it
                // the wrapper is content-sized, `h-full` resolves to nothing,
                // and the link rides up under the fields.
                "space-y-6 px-4 flex-1 md:flex-none"
              : // The landing's gutter. The column used to carry `px-4` for
                // both modes; when the step branch took its own, this one was
                // left with none and welcome and step zero ran edge to edge on
                // every phone. `md:px-0` because the column's `md:px-8` takes
                // over there — a step keeps its `px-4` at `md` instead, to line
                // up with its header's own gutter.
                "gap-4 px-4 md:px-0",
            // Clears the `absolute` mobile header. Safe to cancel at `md`
            // now that the auto margins live on the group, not here — when
            // they lived here, `md:mt-0` silently killed `my-auto`'s top
            // margin and stacked every step against the top of the column.
            isStep && header && "mt-16 md:mt-0",
            // Clear the action bar, which leaves the flow once it is pinned.
            // The two bars are different heights, so the clearances differ.
            footerAction && (isStep ? "pb-24 md:pb-0" : "pb-20 md:pb-0"),
            contentClassName
          )}>
          {children}

          {footerAction && (
            <div
              className={cn(
                "fixed inset-x-0 bottom-0 z-sticky border-t bg-surface",
                // Matching PageShell exactly matters: these steps rendered
                // inside it until now, and `px-3 pb-5` / `border-outline-subtle`
                // is the bar their mobile layout was built against.
                isStep
                  ? "border-outline-subtle px-3 pb-5"
                  : "border-outline px-4 pb-3",
                "md:static md:border-0 md:bg-transparent md:p-0"
              )}>
              {footerAction}
            </div>
          )}
          </div>
        </div>
      </div>

      {showMedia && (
        <div
          aria-hidden="true"
          className={cn(
            "relative w-full overflow-hidden",
            // A size container, so the artwork scales against the box it is
            // GIVEN — both axes — instead of against the viewport. Without the
            // height term a short window crops the composition rather than
            // shrinking it.
            "container-size",
            // Mobile band, `always` only: half the screen where there is room,
            // yielding to the content where there is not.
            mediaOn === "always" && "order-first h-auth-band shrink-0",
            "md:order-none md:h-full md:rounded-panel md:shadow-pop"
          )}>
          {media}
        </div>
      )}
    </div>
  );
}
