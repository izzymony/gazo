/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useRef } from "react";
import { BsThreeDots } from "@/design-system/icons";

interface Option {
  label: string;
  onClick: () => void;
}

interface DropdownMenuProps {
  options: Option[];
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Toggle dropdown visibility. Stop the click bubbling to any clickable
  // ancestor (e.g. a selectable card) so opening the menu can't trigger it.
  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  // Handle clicking outside the dropdown to close
  const handleClickOutside = (event: any) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
  
      <BsThreeDots size={18} className="absolute top-1 right-3"
       onClick={toggleDropdown}  aria-label="Open menu"/>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul className="absolute right-0 z-10 mt-5 bg-white border rounded-lg shadow-lg w-40 text-sm">
          {options.map((option, index) => (
            <li key={index}>
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation(); // don't bubble to a selectable card ancestor
                  option.onClick(); // Call the specific action
                  setIsOpen(false); // Close dropdown after selecting an option
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownMenu;
