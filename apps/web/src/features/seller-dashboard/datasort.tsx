"use client";

import React, { useState } from "react";
import { CiSearch, SortVertical } from "@vibaar/ui/icons";
import SearchField from "@vibaar/ui/common/SearchField";
import Dropdown from "@/features/seller-shell/Dropdown";

interface DataSortProps {
  sortOrder: "ascending" | "descending";
  onSortToggle: () => void;
  onSortOrderChange: (option: "ascending" | "descending") => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const DataSort: React.FC<DataSortProps> = ({
  sortOrder,
  onSortToggle,
  onSortOrderChange,
  searchValue,
  onSearchChange,
}) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center gap-2">
        <Dropdown
          options={["ascending", "descending"]}
          onSelect={(option) =>
            onSortOrderChange(option as "ascending" | "descending")
          }
          selectedOption={sortOrder}
          placeholder="filter"
        />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsSearchVisible((v) => !v)}
            aria-label="Search"
            className="w-9 h-9 flex items-center justify-center rounded-full text-foreground-primary hover:bg-surface-muted transition-colors">
            <CiSearch size={20} />
          </button>
          <button
            type="button"
            onClick={onSortToggle}
            aria-label="Toggle sort order"
            className="w-9 h-9 flex items-center justify-center rounded-full text-foreground-primary hover:bg-surface-muted transition-colors">
            <SortVertical size={20} />
          </button>
        </div>
      </div>

      {isSearchVisible && (
        <SearchField
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search"
        />
      )}
    </div>
  );
};

export default DataSort;
