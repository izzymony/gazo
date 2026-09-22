/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Search, SortVertical } from "@vibaar/ui/icons";

export default function Sort({
  onFilterChange,
  searchValue,
  onSearchChange,
  onSortToggle,
}: {
  onFilterChange: (val: string) => void;
  searchValue: string;
  onSearchChange: (val: any) => void;
  onSortToggle: () => void;
}) {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    onFilterChange(filter);
  };

  const filters = ["All"];

  return (
    <div className="py-1 w-full flex items-center">
      <div className="flex flex-1 gap-2 items-center overflow-x-auto scrollbar-hide">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => handleFilterClick(filter)}
            className={`px-3 py-1 text-caption font-medium rounded-pill whitespace-nowrap transition-colors ${
              activeFilter === filter
                ? "bg-surface-inverse text-white"
                : "bg-surface-subtle text-foreground-primary"
            }`}>
            {filter}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSearchVisible((prev) => !prev)}
          aria-label="Search"
          className="text-foreground-primary">
          <Search size={20} />
        </button>
        {isSearchVisible && (
          <input
            type="text"
            className="p-1 border border-outline rounded-field text-body-sm"
            value={searchValue}
            name="search"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
          />
        )}
        <button onClick={onSortToggle} aria-label="Sort" className="text-foreground-primary">
          <SortVertical size={20} />
        </button>
      </div>
    </div>
  );
}
