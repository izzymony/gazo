"use client";

import React, { useId, useState } from "react";
import { cn } from "@vibaar/utils";
import { focusRing, tabBar, tabBarItem, tabBarItemActive, tabBarItemIdle } from "../styles";

interface TabsProps {
  tabs: string[];
  tabContents: React.ReactNode[];
  onTabChange?: (activeIndex: number) => void;
  /**
   * A row that belongs to the tab bar rather than to any one panel — a filter
   * strip, a date range. It sticks WITH the tab bar rather than under it.
   */
  generalContent?: React.ReactNode;
  tabClass?: string;
  /** Pixel offset for the sticky tab bar — e.g. to sit below a collapsing
   *  header. Applied as an inline `top` so it beats the default `top-0`. */
  stickyTop?: number;
}

/**
 * Tabs — one selected panel from a labelled set.
 *
 * The tab pattern is a contract, not just styling: without role="tablist" /
 * role="tab" / aria-selected a screen reader hears a row of unlabelled buttons
 * and cannot tell which one is active or that a panel belongs to it. This had
 * none of that — selection existed only as a border colour. The roles, the
 * selected state and the tab↔panel link are wired here; nothing visual changed.
 */
const Tabs: React.FC<TabsProps> = ({
  tabs,
  tabContents,
  onTabChange,
  generalContent,
  tabClass,
  stickyTop,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const baseId = useId();
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = (i: number) => `${baseId}-panel-${i}`;

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    if (onTabChange) onTabChange(index);
  };

  return (
    <div className="w-full">
      {/* The tab bar and its general row stick TOGETHER, as one block.
          `generalContent` used to render below, inside a wrapper only as tall as
          itself — and a sticky element cannot travel past its own containing
          block, so a sticky filter row there stuck for zero pixels and simply
          scrolled away while the tabs stayed. Grouping them makes the offsets
          compose: the caller gives one `stickyTop` and the whole block honours
          it. */}
      <div
        style={stickyTop !== undefined ? { top: stickyTop } : undefined}
        className="sticky top-0 z-sticky bg-surface">
        <div
          role="tablist"
          className={cn(
            tabBar,
            tabClass
          )}>
        {tabs.map((tab, index) => {
          const selected = activeTab === index;
          return (
            <button
              key={index}
              type="button"
              role="tab"
              id={tabId(index)}
              aria-selected={selected}
              aria-controls={panelId(index)}
              // Roving tabindex: the tablist is one stop, arrows move within it.
              tabIndex={selected ? 0 : -1}
              onClick={() => handleTabClick(index)}
              onKeyDown={(event) => {
                const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                if (!delta) return;
                event.preventDefault();
                handleTabClick((index + delta + tabs.length) % tabs.length);
              }}
              className={cn(
                tabBarItem,
                focusRing,
                selected
                  ? tabBarItemActive
                  : tabBarItemIdle
              )}>
              {tab}
            </button>
          );
        })}
        </div>
        {generalContent}
      </div>

      {/* Panel — one 16px gap below the sticky block. */}
      <div className="mt-4">
        <div role="tabpanel" id={panelId(activeTab)} aria-labelledby={tabId(activeTab)} tabIndex={0}>
          {tabContents[activeTab]}
        </div>
      </div>
    </div>
  );
};

export default Tabs;
