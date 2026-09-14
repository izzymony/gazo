"use client";

import BottomNav from "@/features/seller-shell/BottomNav";
import DesktopNav from "@/features/seller-shell/DesktopNav";
import React from "react";
import DetailFetcher from "./fectproducts";
import { useSelectedLayoutSegments } from "next/navigation";
import { cn } from "@vibaar/utils";
import { sellerNavMode } from "@/features/seller-shell/sellerNav";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  // The chrome follows the page in `children`, NOT the URL.
  //
  // Those were the same thing until a settings form became a route-backed
  // dialog. An intercepted navigation changes the URL while the page underneath
  // stays put, so a URL-driven `usePathname()` resolved the dialog route's own
  // policy — `none` for /dashboard/settings/change-password, which is right for
  // the full page and wrong for a dialog over the settings list. Opening it took
  // the rail away and reflowed the page behind the panel by 256px.
  //
  // `useSelectedLayoutSegments()` reads the `children` slot, which interception
  // does not touch: it still says `settings/security` while the modal slot holds
  // the dialog. The nav policy itself is unchanged and still keyed by route —
  // this only stops a modal's URL standing in for its page's.
  //
  // Route groups name no URL segment and are dropped. `@` is deliberately NOT
  // filtered: a parallel slot's own segments never reach the `children` key, and
  // a segment starting with `@` is a real one elsewhere in the app (every
  // storefront handle). Filtering it here would be harmless today and wrong the
  // moment this pattern is copied, which is how it broke the buyer shell.
  const segments = useSelectedLayoutSegments();
  const pathname =
    "/dashboard" +
    segments
      .filter((s) => !s.startsWith("("))
      .map((s) => `/${s}`)
      .join("");

  // The two navs answer different questions, so they no longer share a boolean.
  // The bar takes 60px from the page, so a focused flow drops it. The rail sits
  // in a gutter the frame reserves anyway, so it stays for anything you are
  // reading — and only a create or edit flow, which is deliberately
  // distraction-free, goes without either. See sellerNavMode.
  const mode = sellerNavMode(pathname);
  const showRail = mode !== "none";
  const showBar = mode === "full";

  return (
    <>
      {/* Desktop sidebar — fixed, outside the frame, hidden under lg. */}
      {showRail && <DesktopNav />}

      {/* THE FRAME. It is a column: page above, nav below.
          The page box is bounded, positioned, and does NOT scroll — the same
          contract `(buyer)/layout.tsx` provides, and the reason the identical
          storefront and product components work there and did not work here.

          It used to be one div that was `relative` AND `overflow-y-scroll` at
          once, over a max-width wrapper with no height. Two faults, one for each
          of those:

          • No height below it meant every page's own `h-full` scroll region —
            PageShell's `main`, the storefront's and the product's roots —
            resolved to `auto` and grew to its content. Still a scrollport, with
            nothing to scroll: `scrollTop` stuck at 0 forever. That is why
            `useScroll` never fired (no collapsing headers on the seller side)
            and why every `sticky top-0` had zero travel and scrolled away.
          • Being the scroller AND the only positioned ancestor meant every
            `absolute` descendant resolved against a box whose padding box is the
            full scroll height. `bottom-0` therefore meant "the bottom of all the
            content", so the product's action bar rode the page up into the
            middle of it — the same failure BottomNav documents against itself.

          Keep these three properties together: bounded (`min-h-0 flex-1` inside
          the `h-dvh` column), positioned (`relative`), non-scrolling
          (`overflow-hidden`). Pages own scrolling. */}
      <div
        className={cn(
          "flex h-dvh w-full flex-col",
          // The rail is `fixed`, so this padding is the only thing reserving its
          // gutter — and it used to be applied unconditionally, which left every
          // nav-free route indenting 256px for a rail that was never rendered.
          // Both now hang off the same flag, and both read the same token, so the
          // gutter cannot drift from the rail that fills it.
          showRail && "shell-inset-rail pl-shell-inset"
        )}>
        <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>

        {/* In flow, not fixed: the frame subtracts the bar's height from the
            page box, so no page needs to guess it with a bottom margin. */}
        {showBar && <BottomNav />}
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DetailFetcher>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </DetailFetcher>
  );
}
