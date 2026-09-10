"use client";

import { useState } from "react";
import { cn } from "@vibaar/utils";
import SearchField from "./SearchField";
import IconButton from "./IconButton";
import ChipToggle from "./ChipToggle";
import { CiSearch, SortVertical } from "../icons";

interface FilterBarProps {
  pills: string[];
  activePill: number;
  onPillChange: (index: number) => void;
  showSearch?: boolean;
  showSort?: boolean;
  onSearchClick?: () => void;
  onSortClick?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Names the filter set for screen readers, e.g. "Filter products". */
  ariaLabel?: string;
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
  activePill,
  onPillChange,
  showSearch = true,
  showSort = true,
  onSearchClick,
  onSortClick,
  searchValue = "",
  onSearchChange,
  ariaLabel = "Filters",
  className = "",
}: FilterBarProps) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const handleSearchToggle = () => {
    setIsSearchVisible(!isSearchVisible);
    onSearchClick?.();
  };

  return (
    // `sticky top-0` only engages when this is NOT already inside a sticky block
    // — Tabs groups its general row with the tab bar and carries the offset for
    // both, so on the storefront this is a no-op rather than a competing layer.
    <div className={cn("sticky top-0 z-sticky w-full bg-surface pb-2", className)}>
      <div className="w-full flex">
        <div
          role="group"
          aria-label={ariaLabel}
          className="w-full flex flex-1 gap-2 items-center overflow-x-scroll scrollbar-hide py-2">
          {/* A filter is on or off, so it is a toggle — not a link and not a
              tab, neither of which would describe "narrow this list". Shared
              with the product page's variant chips, which are the same control
              and used to look and behave differently. */}
          {pills.map((pill, index) => (
            <ChipToggle
              key={pill}
              selected={activePill === index}
              onClick={() => onPillChange(index)}>
              {pill}
            </ChipToggle>
          ))}
        </div>

        <div className="flex items-center gap-1 py-2">
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
