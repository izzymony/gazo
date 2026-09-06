"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

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
        "flex justify-between lg:justify-center sticky top-0 z-sticky bg-surface",
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
              "w-full lg:w-auto text-center py-2 md:py-3 px-4 md:px-6 lg:px-8 border-b-2 text-body md:text-body-lg transition-all",
              focusRing,
              active
                ? "border-outline-contrast text-foreground-primary font-medium"
                : "border-transparent text-foreground-disabled font-normal hover:text-foreground-secondary hover:border-outline-strong"
            )}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default NavigationTabs;
