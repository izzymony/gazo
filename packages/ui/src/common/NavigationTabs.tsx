import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { cn } from "@vibaar/utils";

interface NavigationTabsProps {
  tabs: { label: string; path: string }[]; // Array of tab labels and their corresponding paths
  tabClass?: string;
}

/**
 * Route-based tab bar. Mirrors the state-based `Tabs` sticky pattern exactly:
 * `sticky top-0 z-sticky bg-white`, no self-padding (inherits PageShell's px),
 * border lives on the buttons — so it pins under the header for the full scroll.
 */
const NavigationTabs: React.FC<NavigationTabsProps> = ({ tabs, tabClass }) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabClick = (path: string) => {
    router.push(path);
  };

  return (
    <div
      className={cn(
        "flex justify-between lg:justify-center sticky top-0 z-sticky bg-white",
        tabClass
      )}>
      {tabs.map((tab, index) => (
        <button
          key={index}
          onClick={() => handleTabClick(tab.path)}
          className={cn(
            "w-full lg:w-auto text-center py-2 md:py-3 px-4 md:px-6 lg:px-8 border-b-2 text-body md:text-body-lg transition-all",
            pathname === tab.path
              ? "border-outline-contrast text-foreground-primary font-medium"
              : "border-transparent text-ink-30 font-normal hover:text-foreground-secondary hover:border-outline-strong"
          )}>
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default NavigationTabs;
