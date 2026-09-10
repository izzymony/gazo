"use client";

import { ReactNode, useState } from "react";
import { cn } from "@vibaar/utils";
import SearchField from "./SearchField";
import IconButton from "./IconButton";
import ChipToggle from "./ChipToggle";
import { CiSearch, SortVertical } from "../icons";

interface FilterBarProps {
  pills?: string[];
  activePill?: number;
  onPillChange?: (index: number) => void;
  /**
   * Replaces the pills in the leading slot — a period selector on analytics, a
   * sort selector on the catalog. Same row, different control: those two
   * screens each drew their own version of this bar because the only leading
   * content it could hold was a pill set.
   */
  leading?: ReactNode;
  /** Sits before the search/sort controls — a date stamp, a count. */
  trailing?: ReactNode;
  showSearch?: boolean;
  showSort?: boolean;
  onSearchClick?: () => void;
  onSortClick?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Names the filter set for screen readers, e.g. "Filter products". */
  ariaLabel?: string;
  /**
   * Whether the row pins to the top of the scroll container. Default true.
   *
   * Off where something above it already pins — otherwise the bar it belongs to
   * scrolls away while these pills stay behind on their own, which is what
   * happened on the storefront once its tab bar stopped pinning.
   */
  sticky?: boolean;
  className?: string;
}

/**
 * FilterBar — a row of filter pills plus the search and sort affordances.
 *
 * The pills are real buttons carrying `aria-pressed`. They were
 * `<div onClick>`: not focusable, no role, and ignoring Enter and Space, so
 * the filters could not be operated from a keyboard at all — on the seller
 * transactions screen, the notifications feed and the buyer storefront.
 *
 * The search and sort controls were unlabelled `<div onClick>` wrappers around
 * hand-drawn SVGs, announcing nothing. They are `IconButton`s on the shared
 * icon set now.
 *
 * It owns no horizontal padding — the page provides it, so the bar aligns to
 * whatever content edge it sits above (same rule as ListItem).
 */
export default function FilterBar({
  pills,
  activePill = 0,
  onPillChange,
  leading,
  trailing,
  showSearch = true,
  showSort = true,
  onSearchClick,
  onSortClick,
  searchValue = "",
  onSearchChange,
  ariaLabel = "Filters",
  sticky = true,
  className = "",
}: FilterBarProps) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const handleSearchToggle = () => {
    setIsSearchVisible(!isSearchVisible);
    onSearchClick?.();
  };

  return (
    <div className={cn("w-full bg-surface", sticky && "sticky top-0 z-sticky", className)}>
      <div className="w-full flex items-center gap-2">
        {leading ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 py-2">{leading}</div>
        ) : (
          <div
            role="group"
            aria-label={ariaLabel}
            className="flex flex-1 items-center gap-2 overflow-x-scroll scrollbar-hide py-2">
            {/* A filter is on or off, so it is a toggle — not a link and not a
                tab, neither of which would describe "narrow this list". Shared
                with the product page's variant chips, which are the same control
                and used to look and behave differently. */}
            {(pills ?? []).map((pill, index) => (
              <ChipToggle
                key={pill}
                selected={activePill === index}
                onClick={() => onPillChange?.(index)}>
                {pill}
              </ChipToggle>
            ))}
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {trailing}
          {showSearch && (
            <IconButton
              icon={CiSearch}
              label={isSearchVisible ? "Hide search" : "Search"}
              onClick={handleSearchToggle}
              aria-expanded={isSearchVisible}
            />
          )}
          {showSort && <IconButton icon={SortVertical} label="Sort" onClick={onSortClick} />}
        </div>
      </div>

      {isSearchVisible && (
        <div className="pb-2 pt-1 border-t border-outline bg-surface">
          <SearchField
            value={searchValue ?? ""}
            onChange={(value) => onSearchChange?.(value)}
            placeholder="Search"
          />
        </div>
      )}
    </div>
  );
}
