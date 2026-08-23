import BottomModal from "@/design-system/common/BottomModal";
import ShippingOptionCard from "@/design-system/common/ShippingOptionCard";
import type { ShippingOptionInfo } from "@/store/shippingStore";

/**
 * The buyer's delivery-option picker sheet (W4.4). Presentational — all state
 * lives in `useDelivery`; this just renders the option list. Extracted verbatim
 * from Product.tsx so the render is unchanged.
 */
export default function DeliverySheet({
  isOpen,
  onClose,
  options,
  selectedId,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  options: ShippingOptionInfo[] | null | undefined;
  selectedId: string | null;
  onSelect: (option: ShippingOptionInfo) => void;
}) {
  return (
    <BottomModal isOpen={isOpen} onClose={onClose}>
      <div>
        <h2 className="text-body-lg font-medium text-center mb-4 ">
          Select a delivery option
        </h2>
        <div className="space-y-2">
          {options && options.length > 0 ? (
            options.map((option) => (
              <ShippingOptionCard
                key={option.id}
                option={option}
                selected={selectedId === option.id}
                onSelect={() => onSelect(option)}
              />
            ))
          ) : (
            <div className="text-center text-ink-40 py-4 text-body-sm">
              No delivery options available. Please select a valid location.
            </div>
          )}
        </div>
      </div>
    </BottomModal>
  );
}
