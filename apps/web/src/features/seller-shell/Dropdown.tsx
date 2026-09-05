import { useState } from "react";
import { ChevronDown } from "@vibaar/ui/icons";

interface DropdownProps {
  options: string[];
  onSelect: (option: string) => void;
  selectedOption: string;
  placeholder: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  onSelect,
  selectedOption,
  placeholder = "filter",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleOptionClick = (option: string) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={toggleDropdown}
        className="bg-surface-subtle text-foreground-secondary font-medium py-1 px-3 rounded-pill inline-flex items-center text-body-sm">
        <span>{selectedOption ? selectedOption : placeholder}</span>
        <ChevronDown
          size={16}
          className={`ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul className="absolute z-dropdown mt-1 bg-surface shadow-card rounded-field px-4 py-1">
          {options.map((option, index) => (
            <li
              key={index}
              onClick={() => handleOptionClick(option)}
              className="cursor-pointer text-foreground-primary hover:bg-surface-muted rounded-field py-2 px-2 text-body-sm">
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
