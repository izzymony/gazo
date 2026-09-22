"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { cn } from "@vibaar/utils";
import { focusRing, tabBar, tabBarItem, tabBarItemActive, tabBarItemIdle } from "../styles";

interface NavigationTabsProps {
  tabs: { label: string; path: string }[];
  tabClass?: string;
  /** Names the landmark for screen readers, e.g. "Wallet sections". */
  ariaLabel?: string;
}

/**
 * Route-based tab bar. Visually identical to `Tabs`, but a different pattern
 * underneath: these change the URL, so they are NAVIGATION, not tabs. The
 * correct semantics are a <nav> of links with aria-current="page" — not
 * role="tablist", which would promise a tab/panel relationship that does not
 * exist here.
 *
 * They were plain <button onClick={router.push}> with no ARIA at all: the
 * active tab was only a border colour, and because they were buttons rather
 * than links you could not middle-click, open in a new tab, or copy the
 * address. Links fix all of that and render identically.
 */
const NavigationTabs: React.FC<NavigationTabsProps> = ({ tabs, tabClass, ariaLabel = "Section navigation" }) => {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        tabBar,
        tabClass
      )}>
      {tabs.map((tab) => {
        const active = pathname === tab.path;
        return (
          <Link
            key={tab.path}
            href={tab.path}
            aria-current={active ? "page" : undefined}
            className={cn(
              tabBarItem,
              focusRing,
              active
                ? tabBarItemActive
                : tabBarItemIdle
            )}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default NavigationTabs;
