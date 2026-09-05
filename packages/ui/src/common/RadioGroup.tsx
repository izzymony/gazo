import React from "react";
import { cn } from "@vibaar/utils";

interface Option {
  label: string;
  value: string;
  days?: string; // column variant: secondary line (e.g. "5 days")
  price?: string; // column variant: trailing price (e.g. "12.0")
}

interface RadioGroupProps {
  options: Option[];
  name: string;
  selectedValue: string | null;
  onChange: (value: string) => void;
  className?: string;
  /** "row" = the compact inline group; "column" = the bordered price/days cards. */
  orientation?: "row" | "column";
}

// Shared radio dial — brand-coloured when selected, neutral ring when not.
const Indicator = ({ selected }: { selected: boolean }) => (
  <div
    className={cn(
      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
      selected ? "border-brandDeep" : "border-outline-emphasis"
    )}>
    {selected && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}
  </div>
);

/**
 * Unified radio group primitive (W3.6) — merges the former `RadioGroup` (inline
 * row) and `RadioGroupColumn` (bordered cards with days/price). Selection is shown
 * by the brand-coloured dial; both layouts stay symmetric across states.
 */
const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  name,
  selectedValue,
  onChange,
  className = "",
  orientation = "row",
}) => {
  if (orientation === "column") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex justify-between items-center p-3 border rounded-field cursor-pointer transition-colors",
              selectedValue === option.value
                ? "border-brandDeep bg-brand/5"
                : "border-outline"
            )}>
            <div className="flex items-center gap-4">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selectedValue === option.value}
                onChange={(e) => onChange(e.target.value)}
                className="hidden"
              />
              <Indicator selected={selectedValue === option.value} />
              <div className="flex flex-col">
                <p className="font-normal text-body text-foreground-primary">
                  {option.label}
                </p>
                {option.days && (
                  <p className="text-caption text-foreground-secondary font-normal">
                    {option.days}
                  </p>
                )}
              </div>
            </div>
            {option.price && (
              <p className="font-medium text-body text-foreground-primary">
                {option.price}
              </p>
            )}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 items-center w-full", className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center gap-2 flex-1 cursor-pointer py-1">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={selectedValue === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="hidden"
          />
          <Indicator selected={selectedValue === option.value} />
          <span className="text-body text-foreground-primary">{option.label}</span>
        </label>
      ))}
    </div>
  );
};

export default RadioGroup;
