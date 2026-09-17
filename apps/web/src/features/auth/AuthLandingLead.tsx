"use client";

import BrandLogo from "@vibaar/ui/common/BrandLogo";
import useMediaActive from "@vibaar/ui/common/useMediaActive";
import { AUTH_LANDING_HEADING, AUTH_LANDING_SUPPORT } from "./authScenes";

/**
 * The auth landing's fixed opening: wordmark, heading, supporting line.
 *
 * "Fixed" is the whole point. The visual panel now rotates through three
 * scenes, and if the heading rotated with it the form and its actions would
 * move every 6.5 seconds. So the panel tells the story and this states what
 * the page is; neither one moves the other.
 *
 * ## Why the heading is `sr-only` on mobile
 *
 * At `md+` this is a visible heading above the actions. Below `md` the rotating
 * scene copy stays exactly where it is today — directly under the artwork band,
 * at the same offset — and adding a second heading above it would push that
 * caption down the column, which is the one thing the mobile presentation was
 * required not to do.
 *
 * It is still in the document, because the alternative is worse: the rotating
 * headline is a `<p>` by design (a heading that changes on a timer restructures
 * the outline while someone is reading it), so without this the mobile page
 * would have no `h1` at all. It is not hidden content — it is the page's
 * proposition, stated once, in the position the outline wants it.
 */
export default function AuthLandingLead() {
  // A `display: none` image is still fetched, so `hidden md:block` shipped the
  // wordmark to every phone that never saw it. This gates the MOUNT, and is
  // `false` on the server, so it does not reach the mobile HTML at all.
  const showWordmark = useMediaActive("md");

  return (
    <div className="md:text-center">
      {/* The box is reserved at its rendered height: this column is vertically
          centred at `md`, so mounting the logo after hydration would otherwise
          shift everything beneath it by half the logo's height. */}
      <div className="hidden md:mb-8 md:flex md:h-14 md:items-center md:justify-center">
        {showWordmark && <BrandLogo width={180} />}
      </div>

      {/* `text-display` at `md` to match `/welcome`, which shares this frame —
          at `text-h1` on both widths it read as a different screen sitting next
          to a 40px headline. No `leading-[44px]`: the token already carries it. */}
      <h1 className="sr-only text-balance font-medium tracking-wide text-foreground-primary md:not-sr-only md:text-display">
        {AUTH_LANDING_HEADING}
      </h1>

      {/* Desktop only. On mobile the rotating description occupies this
          position, and two descriptions would say the same thing twice. */}
      <p className="hidden text-balance text-body font-normal text-foreground-secondary md:mt-3 md:block">
        {AUTH_LANDING_SUPPORT}
      </p>
    </div>
  );
}
