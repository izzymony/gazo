import React, { useState } from "react";
import { cn } from "@/lib/utils";

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

const Tabs: React.FC<TabsProps> = ({
  tabs,
  tabContents,
  onTabChange,
  generalContent,
  tabClass,
  stickyTop,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabClick = (index: number) => {
    setActiveTab(index);
    if (onTabChange) onTabChange(index);
  };

  return (
    <div className="w-full">
      {/* Tab bar — sticks within PageShell's scroll; inherits its horizontal padding */}
      <div
        style={stickyTop !== undefined ? { top: stickyTop } : undefined}
        className={cn(
          "flex justify-between lg:justify-center sticky top-0 z-sticky bg-white",
          tabClass
        )}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabClick(index)}
            className={cn(
              "w-full lg:w-auto text-center py-2 md:py-3 px-4 md:px-6 lg:px-8 border-b-2 text-body md:text-body-lg transition-all",
              activeTab === index
                ? "border-ink-90 text-ink-90 font-medium"
                : "border-transparent text-ink-30 font-normal hover:text-ink-60 hover:border-ink-20"
            )}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content — one 16px gap below the tab bar; optional filter row above it */}
      <div className="mt-4">
        {generalContent && <div className="mb-4">{generalContent}</div>}
        {tabContents[activeTab]}
      </div>
    </div>
  );
};

export default Tabs;
