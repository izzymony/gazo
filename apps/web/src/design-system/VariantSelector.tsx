import React, { useState, useEffect } from "react";
import { ProductData, Variant, VariantCombination } from "@/lib/types";
import { calculateAllCombinations, calculateSelectedVariant } from "@/utils/variantCalculations";

interface SelectVariantsProps {
  product: ProductData;
  onVariantChange?: (selection: { [variantName: string]: string }, calculatedVariant: VariantCombination | null) => void;
}

const SelectVariants: React.FC<SelectVariantsProps> = ({ product, onVariantChange }) => {
  const [selectedValues, setSelectedValues] = useState<{ [variantName: string]: string }>({});
  const [availableCombinations, setAvailableCombinations] = useState<VariantCombination[]>([]);

  // Initialize variant selections and calculate combinations
  useEffect(() => {
    if (!product.variants || product.variants.length === 0) {
      return;
    }

    // Calculate all available combinations
    const combinations = calculateAllCombinations(product);
    setAvailableCombinations(combinations);

    // Initialize selections with first available value for each variant
    const initialSelections: { [variantName: string]: string } = {};
    product.variants.forEach((variant) => {
      if (variant.types && variant.types.length > 0) {
        initialSelections[variant.name] = variant.types[0];
      }
    });

    setSelectedValues(initialSelections);

    // Calculate initial variant data
    if (Object.keys(initialSelections).length > 0) {
      const selectedVariant = calculateSelectedVariant(product, initialSelections);
      onVariantChange?.(initialSelections, selectedVariant);
    }
  }, [product, onVariantChange]);

  const handleVariantChange = (variantName: string, value: string) => {
    const newSelections = { ...selectedValues, [variantName]: value };
    setSelectedValues(newSelections);

    // Calculate the selected variant combination
    const selectedVariant = calculateSelectedVariant(product, newSelections);
    onVariantChange?.(newSelections, selectedVariant);
  };

  // If no variants, don't render anything
  if (!product.variants || product.variants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="font-medium text-sm">Select variants</p>

      {product.variants.map((variant) => {
        const selectedValue = selectedValues[variant.name] || '';

        return (
          <div key={variant.id || variant.name}>
            <p className="font-medium text-caption text-ink-60 mb-2">
              {variant.name}: <span className="text-ink-60">{selectedValue}</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {variant.types.map((value) => (
                <div
                  key={value}
                  onClick={() => handleVariantChange(variant.name, value)}
                  className={`cursor-pointer px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedValue === value
                      ? "bg-instaRed text-white"
                      : "bg-ink-3 text-gray-700"
                  }
                 ${selectedValue !== value ? "hover:bg-gray-300" : ""}`}
                >
                  {value}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SelectVariants;