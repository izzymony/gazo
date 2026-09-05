"use client";

import React, { useEffect, useState } from "react";
import useBusinessStore from "@/store/businessStore";

export const ColoredPattern = ({
  onSelect,
  onPatternSelect,
}: {
  onSelect?: (a: string) => void;
  onPatternSelect?: (pattern: string) => void;
}) => {
  const { theme } = useBusinessStore();
  const [selectedColor, setSelectedColor] = useState(theme?.backgroundColor);
  const [selectedPattern, setSelectedPattern] = useState(0);

  useEffect(() => {
    setSelectedColor(theme?.backgroundColor);
  }, [theme?.backgroundColor]);

  const colors = [
    "#5146cb",
    "#3AC61E",
    "#292e13",
    "#d7ef3c",
    "#C61E21",
    "#C6A71E",
    "#1EA7C6",
    "#AD1EC6",
    "#E8EF1C",
  ];
  const patterns = [
    "/pattern1.svg",
    "/pattern1.svg",
    "/pattern1.svg",
    "/pattern1.svg",
  ];

  // Update global theme when color or pattern changes
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    onSelect && onSelect(color);
  };

  const handlePatternChange = (pattern: string, index: number) => {
    setSelectedPattern(index);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    onPatternSelect && onPatternSelect(pattern);
  };

  const handleSelection =
    (handler: () => void) =>
    (event: React.MouseEvent | React.KeyboardEvent) => {
      if ("key" in event && event.key !== "Enter") return;
      handler();
    };

  return (
    <div className="w-full">
      {/* Pattern Preview Boxes */}
      <div className="flex gap-2 overflow-x-auto whitespace-nowrap px-4 py-2">
        {patterns.map((pattern, index) => (
          <div
            key={index}
            className={`w-[128px] h-[75px] rounded-card p-2 flex-shrink-0 relative border border-outline cursor-pointer  ${
              index === selectedPattern
                ? "ring-2 ring-offset-2 ring-outline-contrast"
                : ""
            }`}
            style={{
              backgroundColor: "gray",
              backgroundImage: `url(${pattern})`,
              backgroundSize: "cover",
              backgroundBlendMode: "multiply",
            }}
            onClick={handleSelection(() => handlePatternChange(pattern, index))}
            onKeyDown={handleSelection(() =>
              handlePatternChange(pattern, index)
            )}
            role="button"
            tabIndex={0}
            aria-label={`Select pattern ${index + 1}`}
            title={`Click to select pattern ${index + 1}`}></div>
        ))}
      </div>

      {/* Brand Color Header */}
      <p className="mt-4 font-medium text-body mb-2">Brand Color </p>
      <p className="font-normal text-caption text-foreground-secondary">
        Pick a color or pattern, or enter a custom color code
      </p>

      {/* Selected Color Section */}
      <div className="border border-outline-strong rounded-card px-3 py-3 mt-4">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-field border border-outline"
            style={{ backgroundColor: selectedColor }}
            title="Selected Color"></div>
          <div className="flex flex-col">
            <p className="text-caption text-foreground-secondary">Enter color code</p>
            <p className="text-body font-medium text-foreground-primary">{selectedColor}</p>
          </div>
        </div>

        {/* Color Options */}
        <div className="flex gap-3 flex-wrap mt-4">
          {colors.map((color) => (
            <div
              key={color}
              className={`w-10 h-10 rounded-field border border-outline cursor-pointer
                                ${
                                  color === selectedColor
                                    ? "ring-2 ring-offset-2 ring-outline-contrast"
                                    : ""
                                }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              onKeyDown={(e) => e.key === "Enter" && handleColorChange(color)}
              role="button"
              tabIndex={0}
              aria-label={`Select color ${color}`}
              title={`Click to select ${color}`}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColoredPattern;
