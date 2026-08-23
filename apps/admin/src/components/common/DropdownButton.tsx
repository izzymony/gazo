import React from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  key: string;
  label: string;
}

interface DropdownButtonProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export default function DropdownButton({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  icon
}: DropdownButtonProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      {icon && (
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {icon}
        </div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          appearance-none
          h-10 px-4 ${icon ? 'pl-10' : ''} pr-10
          text-sm font-medium
          bg-gray-100 text-gray-700
          hover:bg-gray-200
          rounded-full
          border-0
          cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-instaRed
          transition-all duration-200
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
    </div>
  );
}