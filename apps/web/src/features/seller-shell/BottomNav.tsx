"use client";
import React, { memo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import NavGlyph from "@vibaar/ui/common/NavGlyph";
import NavItem from "@vibaar/ui/common/NavItem";
import { SELLER_NAV, activeSellerNav } from "./sellerNav";

/**
 * The seller dashboard's mobile bar.
 *
 * Its destinations and its active-path matcher now come from `sellerNav`,
 * shared with DesktopNav rather than copied into it, and each entry is a
 * `NavItem` — so they are links: middle-clickable, openable in a new tab, and
 * carrying `aria-current` rather than signalling the active tab by colour only.
 */
const BottomNav = memo(() => {
  const pathName = usePathname();
  const activeNavItem = activeSellerNav(pathName);
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  // Clear the tab spinner as soon as the destination route actually lands.
  // (Previously coupled to the global businessLoading store flag, which stayed
  // true and left the active tab stuck on a false "Loading…" state.)
  useEffect(() => {
    setLoadingRoute(null);
  }, [pathName]);

  return (
    // IN FLOW, inside the dashboard frame's column — not fixed and not absolute.
    //
    // Absolute was the original bug: the bar resolved against a positioned
    // ancestor that was also the scroll container, whose padding box is the full
    // scrollable height, so it sat at the bottom of all the content and scrolled
    // away. Fixed cured that but paid for it — a viewport-pinned bar overlays the
    // page, so its 60px had to be subtracted by hand everywhere else, and the
    // same magic number ended up written in four places (the layout's `mb`, a
    // sheet's `mb`, and two different guesses at how high a floating button must
    // sit). The frame is a column now: this bar is its second row, so the page
    // box is already the right height and nothing has to know how tall we are.
    //
    // `pb-safe` clears the iOS home indicator (the utility itself is defined in
    // the design-tokens preset — it was being written before it existed), and
    // `box-content` keeps that padding OUTSIDE the 60px so the tabs themselves
    // stay 60px tall on a notched phone instead of being squeezed by it.
    <div className="z-sticky box-content flex h-[60px] w-full shrink-0 items-center justify-between border-t-[0.5px] border-t-outline bg-surface pb-safe lg:hidden">
      {SELLER_NAV.map(({ title, Icon, Solid, route }) => {
        const isActive = activeNavItem === title;
        return (
          <NavItem
            key={title}
            href={route}
            icon={<NavGlyph active={isActive} icon={Icon} size={22} solid={Solid} />}
            label={title}
            showLabel
            active={isActive}
            loading={loadingRoute === route}
            spinnerSize={22}
            // While one tab is navigating, the others are inert — but the
            // active tab stays usable so you are never trapped.
            disabled={loadingRoute !== null && !isActive && loadingRoute !== route}
            onNavigate={() => {
              if (pathName !== route) setLoadingRoute(route);
            }}
            className="flex-1 h-full"
          />
        );
      })}
    </div>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
