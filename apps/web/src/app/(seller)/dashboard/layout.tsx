"use client";

import BottomNav from "@/features/seller-shell/BottomNav";
import DesktopNav from "@/features/seller-shell/DesktopNav";
import React from "react";
import DetailFetcher from "./fectproducts";
import { usePathname } from "next/navigation";
import { isSellerHub } from "@/features/seller-shell/sellerNav";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Nav belongs to the navigable hubs only. Everything deeper is a focused flow
  // (a form, a product, an order) that the user finishes and backs out of.
  const showNav = isSellerHub(pathname);

  return (
    <>
      {/* Desktop sidebar — fixed, outside the frame, hidden under lg. */}
      {showNav && <DesktopNav />}

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
      <div className="flex h-dvh w-full flex-col lg:pl-64">
        <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>

        {/* In flow, not fixed: the frame subtracts the bar's height from the
            page box, so no page needs to guess it with a bottom margin. */}
        {showNav && <BottomNav />}
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
