/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DeliveryTruck,
  FaLocationDot,
  ChevronRight,
  Shield,
  AiOutlineInfoCircle,
} from "@/design-system/icons";
import type { ShippingOptionInfo } from "@/store/shippingStore";

/**
 * The buyer's "Delivery & Returns" card (W4.4).
 *
 * Presentational — all state lives in `useDelivery`; this renders the From→To
 * route, the selected-delivery summary, and the return-policy row. It is the
 * SINGLE source for both the mobile (`lg:hidden`) and desktop-sidebar slots of
 * Product.tsx (the two were divergent copies that had drifted: a "days days"
 * duplication, a stray glyph, leftover console.logs, kebab-case SVG attrs).
 *
 * Systemised in the same pass: inline SVGs → HugeIcons, hardcoded hex → tokens.
 * The location + delivery-sheet modals are mounted ONCE in Product.tsx (they
 * used to be duplicated per slot), so this card only opens them via callbacks.
 */
export default function DeliveryCard({
  className = "",
  returnRowClassName = "",
  store,
  stor,
  singleShippingDetails,
  selectedDeliveryLocation,
  location,
  selectedDelivery,
  shippingOptions,
  openLocationModal,
  openDeliveryModal,
}: {
  className?: string;
  returnRowClassName?: string;
  store: any;
  stor: any;
  singleShippingDetails: any;
  selectedDeliveryLocation: any;
  location: any;
  selectedDelivery: ShippingOptionInfo | null;
  shippingOptions: ShippingOptionInfo[] | null | undefined;
  openLocationModal: () => void;
  openDeliveryModal: () => void;
}) {
  const sellerLocation =
    store?.address?.address_line || store?.address?.province;
  const buyerLocation = stor?.address?.address_line || stor?.address?.province;
  const fromLocation = sellerLocation || buyerLocation || "(location not set)";

  const toLocation =
    location?.properties?.full_address ||
    selectedDeliveryLocation?.full_address ||
    (singleShippingDetails?.id
      ? `${singleShippingDetails.street} ${singleShippingDetails.town} ${singleShippingDetails.country}`
      : "Select a Location");

  return (
    <div className={className}>
      <p className="font-medium text-sm mb-3">Delivery &amp; Returns</p>

      <div className="pt-3 rounded-lg lg:rounded-xl bg-ink-3 mt-3 mb-0">
        {/* From row (origin marker + dashed connector on the route rail) */}
        <div className="flex px-2 justify-between w-full">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="w-4 h-4 rounded-full bg-instaRed/10 border border-instaRed/40 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-instaRed" />
              </span>
              <span className="w-px h-4 border-l border-dashed border-instaRed/50" />
            </div>
            <div className="flex gap-2 items-center">
              <DeliveryTruck size={20} className="text-black" />
              <p className="text-sm font-medium">From:</p>
            </div>
          </div>
          <div className="flex-1 ml-1">
            <p className="text-xs font-normal line-clamp-1 text-right">
              {fromLocation}
            </p>
          </div>
        </div>

        {/* To row (route destination) */}
        <div className="flex px-2 justify-between mb-2 gap-3 w-full">
          <div className="flex items-center gap-3">
            <FaLocationDot size={18} className="text-instaRed" />
            <p className="text-sm font-medium">To:</p>
          </div>
          <div
            className="text-instaRed flex gap-1 items-center text-xs font-medium cursor-pointer flex-1 justify-end"
            onClick={openLocationModal}>
            <FaLocationDot size={12} className="text-instaRed shrink-0" />
            <p className="line-clamp-1">{toLocation}</p>
          </div>
        </div>

        {/* Selected-delivery summary */}
        <div className="bg-white border border-ink-10 rounded-xl lg:rounded-2xl px-4 py-4 space-y-2">
          <div className="flex justify-between items-center text-sm font-normal">
            <p className="text-ink-60">
              {selectedDelivery?.delivery_type || "Standard delivery"}:
            </p>
            <p>{selectedDelivery?.price?.replace(/^N/, "") || "₦0"}</p>
          </div>
          <div className="flex justify-between items-center text-sm font-medium">
            <p className="text-ink-60">Arrives by:</p>
            <p>~{selectedDelivery?.delivery_days}</p>
          </div>
          <div
            className="cursor-pointer py-1 px-2 border bg-instaRed/10 rounded-pill border-instaRed flex justify-between items-center"
            onClick={() => {
              if (shippingOptions && shippingOptions.length > 0) {
                openDeliveryModal();
              } else {
                openLocationModal();
              }
            }}>
            <div className="flex gap-2 items-center">
              <p>🔥</p>
              <p className="line-clamp-1 text-xs font-normal tracking-[0.5px]">
                {selectedDelivery?.delivery_type || "Fastest"} Delivery between{" "}
                {selectedDelivery?.delivery_days || "1 to 2 business days"}
              </p>
            </div>
            <ChevronRight size={16} className="text-instaRed shrink-0" />
          </div>
        </div>
      </div>

      {/* Return policy */}
      <div
        className={`flex flex-row justify-between items-center ${returnRowClassName}`}>
        <div className="flex items-center space-x-2">
          <Shield size={20} className="text-black" />
          <p className="text-xs font-medium">Return policy</p>
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-ink-70 text-xs font-normal">
            Free return within{" "}
            <span className="text-black font-semibold">24hrs</span>
          </p>
          <AiOutlineInfoCircle size={20} className="text-black" />
        </div>
      </div>
    </div>
  );
}
