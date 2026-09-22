"use client";

import React from "react";
import FilterBar from "@vibaar/ui/common/FilterBar";
import DropdownSelect from "@vibaar/ui/common/DropdownSelect";

interface DataSortProps {
  sortOrder: "ascending" | "descending";
  onSortToggle: () => void;
  onSortOrderChange: (option: "ascending" | "descending") => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/**
 * The catalog's sort + search row.
 *
 * It used to draw the whole row itself: its own flex container, its own
 * two-per-row spacing, and two hand-rolled `w-9 h-9` circles for search and
 * sort — the exact shape `IconButton` exists to stop being redrawn. Meanwhile
 * the storefront had the identical row via `FilterBar` and analytics had a
 * third version inline. Same row, three implementations, three rhythms; that is
 * why the gap under the tab bar differed from screen to screen.
 *
 * It is FilterBar now, with the sort selector in the leading slot where the
 * storefront puts its filter pills.
 */
const DataSort: React.FC<DataSortProps> = ({
  sortOrder,
  onSortToggle,
  onSortOrderChange,
  searchValue,
  onSearchChange,
}) => (
  <FilterBar
    sticky={false}
    ariaLabel="Sort and search products"
    leading={
      <DropdownSelect
        options={["ascending", "descending"]}
        value={sortOrder}
        onSelect={(option) => onSortOrderChange(option as "ascending" | "descending")}
        ariaLabel="Sort order"
      />
    }
    onSortClick={onSortToggle}
    searchValue={searchValue}
    onSearchChange={onSearchChange}
  />
);

export default DataSort;
