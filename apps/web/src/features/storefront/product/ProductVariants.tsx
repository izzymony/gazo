import ChipToggle from "@vibaar/ui/common/ChipToggle";

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
      <h2 className="text-body font-medium text-foreground-primary">Select variants</h2>
      {variations.map((variant) => {
        const key = (variant?.name || variant?.option) as string;
        const chosen = selected[key];
        return (
          <div key={variant.id} className="mt-4">
            <h3 className="text-body-sm font-medium capitalize text-foreground-secondary">
              {variant.name || variant.option}
              {chosen ? (
                <span className="text-foreground-primary">: {String(chosen)}</span>
              ) : null}
            </h3>
            {/* Chips are 36px tall and carry `aria-pressed`.
                They were 22px `<button>`s with no `type`, no pressed state and a
                `bg-black text-white` selected style that no other toggle in the
                app uses — on the control a shopper must operate to buy anything
                with variants. The selected style is now the same pair FilterBar
                uses for the identical "this one is on" meaning. */}
            <div className="mt-2 flex flex-wrap gap-2">
              {(variant.types || variant.values || []).map(
                (option: string, optionIndex: number) => {
                  const isSelected = (chosen ?? "") === option;
                  return (
                    <ChipToggle
                      key={optionIndex}
                      selected={isSelected}
                      onClick={() =>
                        onSelect(variant.name || variant.option || "", option)
                      }>
                      {option}
                    </ChipToggle>
                  );
                }
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
