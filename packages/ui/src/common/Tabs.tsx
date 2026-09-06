"use client";

import React, { useId, useState } from "react";
import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

interface TabsProps {
  tabs: string[];
  tabContents: React.ReactNode[];
  onTabChange?: (activeIndex: number) => void;
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
      {/* Tab bar — sticks within PageShell's scroll; inherits its horizontal padding */}
      <div
        role="tablist"
        style={stickyTop !== undefined ? { top: stickyTop } : undefined}
        className={cn(
          "flex justify-between lg:justify-center sticky top-0 z-sticky bg-surface",
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
                "w-full lg:w-auto text-center py-2 md:py-3 px-4 md:px-6 lg:px-8 border-b-2 text-body md:text-body-lg transition-all",
                focusRing,
                selected
                  ? "border-outline-contrast text-foreground-primary font-medium"
                  : "border-transparent text-foreground-disabled font-normal hover:text-foreground-secondary hover:border-outline-strong"
              )}>
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content — one 16px gap below the tab bar; optional filter row above it */}
      <div className="mt-4">
        {generalContent && <div className="mb-4">{generalContent}</div>}
        <div role="tabpanel" id={panelId(activeTab)} aria-labelledby={tabId(activeTab)} tabIndex={0}>
          {tabContents[activeTab]}
        </div>
      </div>
    </div>
  );
};

export default Tabs;
