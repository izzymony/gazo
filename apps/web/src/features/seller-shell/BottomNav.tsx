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
    // FIXED, not absolute. An absolutely-positioned bar resolves against its
    // nearest positioned ancestor's PADDING BOX — and once that ancestor became
    // the scroll container, its padding box is the full scrollable height, so the
    // nav sat at the bottom of all the content and scrolled away with it instead
    // of staying on screen. DesktopNav is fixed for the same reason.
    <div className="fixed bottom-0 left-0 right-0 z-sticky flex h-[60px] w-full items-center justify-between border-t-[0.5px] border-t-outline bg-surface lg:hidden">
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
