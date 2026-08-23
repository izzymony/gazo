type VariantOption = string | number | boolean;

type Variation = {
  id: string;
  name?: string;
  option?: string;
  values?: string[];
  types?: string[];
};

/**
 * Variant chip selector, extracted + deduped from the Product god-page (W4.4) —
 * previously duplicated verbatim in the mobile and desktop layouts (only the
 * wrapper className differed, now a prop). Rendering preserved.
 */
export default function ProductVariants({
  variations,
  selected,
  onSelect,
  className,
}: {
  variations: Variation[];
  selected: Record<string, VariantOption>;
  onSelect: (variantName: string, option: VariantOption) => void;
  className?: string;
}) {
  return (
    <div className={className} data-variant-section>
      <h2 className="text-sm font-medium mb-1">Select variants</h2>
      {variations.map((variant) => (
        <div key={variant.id} className="mt-4">
          <h3 className="text-caption font-medium capitalize">
            {variant.name || variant.option}:{" "}
            {selected[(variant?.name || variant?.option) as string]}
          </h3>
          <div className="flex mt-2 space-x-2">
            {(variant.types || variant.values || []).map(
              (option: string, optionIndex: number) => (
                <button
                  key={optionIndex}
                  className={`px-4 h-[22px] text-body-sm bg-ink-3 rounded-full ${
                    (selected[(variant?.name || variant?.option) as string] ||
                      "") === option
                      ? "bg-black text-white"
                      : ""
                  }`}
                  onClick={() =>
                    onSelect(variant.name || variant.option || "", option)
                  }
                >
                  {option}
                </button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
