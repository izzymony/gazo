import React from 'react';
import Button from './Button';

interface FilterOption {
  key: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  filters: FilterOption[];
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  className?: string;
}

export default function FilterTabs({ 
  filters, 
  selectedFilter, 
  onFilterChange, 
  className = "" 
}: FilterTabsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {filters.map((filter) => (
        <Button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          variant={selectedFilter === filter.key ? "filled" : "filter"}
          size="md"
        >
          {filter.label}
          {filter.count !== undefined && ` (${filter.count})`}
        </Button>
      ))}
    </div>
  );
}