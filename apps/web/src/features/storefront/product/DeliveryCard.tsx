/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DeliveryTruck,
  FaLocationDot,
  ChevronRight,
  Shield,
  AiOutlineInfoCircle,
} from "@vibaar/ui/icons";
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
  /** The VENDOR being bought from — the delivery origin. */
  store: any;
  singleShippingDetails: any;
  selectedDeliveryLocation: any;
  location: any;
  selectedDelivery: ShippingOptionInfo | null;
  shippingOptions: ShippingOptionInfo[] | null | undefined;
  openLocationModal: () => void;
  openDeliveryModal: () => void;
}) {
  // The origin is the VENDOR's address, full stop. There used to be a second
  // fallback here reading the signed-in user's OWN store — so when a vendor had
  // no address recorded, a shopper who happened to be a seller saw their own
  // address presented as the shipping origin.
  const fromLocation =
    store?.address?.address_line || store?.address?.province || "Not specified";

  const toLocation =
    location?.properties?.full_address ||
    selectedDeliveryLocation?.full_address ||
    (singleShippingDetails?.id
      ? `${singleShippingDetails.street} ${singleShippingDetails.town} ${singleShippingDetails.country}`
      : "Select a Location");

  const hasSelection = Boolean(selectedDelivery?.id);

  return (
    <div className={className}>
      <p className="mb-3 text-body font-medium text-foreground-primary">
        Delivery &amp; Returns
      </p>

      {/*
        Route rail. Radii are tokens (field/card) rather than the mixed
        rounded-lg / rounded-xl / rounded-2xl this carried, and every size is a
        step on the type scale.

        THE INSET IS 4px, AND THAT IS THE RADIUS RULE, NOT A TASTE CALL. Radii
        nest as `outer = inner + the padding between them`. This rail is 16 and
        the delivery card inside it is 12, so the only inset that draws
        concentric corners is 4 — at the 12 it used to carry, 16 should have been
        24, and the corner gap thickened around each diagonal. Change either
        radius and this padding has to move with it.
      */}
      <div className="rounded-card bg-surface-subtle p-1">
        {/*
          The From→To block keeps the 12px inset it has always had: 4 from the
          rail plus 8 here. Only the delivery card below tightens to the rail —
          the route reads as text on the rail's surface, not as a nested card, so
          it has nothing to be concentric with and no reason to move.
        */}
        <div className="px-2 pt-2">
        {/* From row (origin marker + dashed connector on the route rail) */}
        <div className="flex w-full items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-pill border border-brandDeep/40 bg-brand/10">
                <span className="h-2 w-2 rounded-pill bg-brand" />
              </span>
              <span className="h-4 w-px border-l border-dashed border-brandDeep/50" />
            </div>
            <div className="flex items-center gap-2">
              <DeliveryTruck size={18} className="text-foreground-primary" aria-hidden="true" />
              <p className="text-body-sm font-medium text-foreground-primary">From:</p>
            </div>
          </div>
          <p className="min-w-0 flex-1 line-clamp-1 text-right text-body-sm font-normal text-foreground-secondary">
            {fromLocation}
          </p>
        </div>

        {/* To row (route destination) */}
        <div className="mb-3 flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaLocationDot size={18} className="text-brandDeep" aria-hidden="true" />
            <p className="text-body-sm font-medium text-foreground-primary">To:</p>
          </div>
          <button
            type="button"
            aria-label="Choose a delivery location"
            className="flex min-h-9 min-w-0 flex-1 items-center justify-end gap-1 rounded-field text-body-sm font-medium text-brandDeep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40"
            onClick={openLocationModal}>
            <FaLocationDot size={12} className="shrink-0 text-brandDeep" aria-hidden="true" />
            <span className="line-clamp-1 text-left">{toLocation}</span>
          </button>
        </div>
        </div>

        {/* Selected-delivery summary. 12px inside: 16 read as a room of its own
            in a 380px panel, and the rail around it is only 4. */}
        <div className="space-y-2 rounded-field border border-outline bg-surface p-3">
          <div className="flex items-center justify-between text-body-sm font-normal">
            <p className="text-foreground-secondary">
              {selectedDelivery?.delivery_type || "Delivery"}
            </p>
            {/* Placeholders rather than a fabricated price and a lone "~": with
                nothing selected these read "₦0" and "~", which look like real
                quotes for a free, instant delivery. */}
            <p className="font-medium text-foreground-primary">
              {hasSelection ? selectedDelivery?.price?.replace(/^N/, "") : "Select a location"}
            </p>
          </div>
          {hasSelection && selectedDelivery?.delivery_days && (
            <div className="flex items-center justify-between text-body-sm font-medium">
              <p className="text-foreground-secondary">Arrives by:</p>
              <p className="text-foreground-primary">~{selectedDelivery.delivery_days}</p>
            </div>
          )}
          <button
            type="button"
            className="flex min-h-9 w-full items-center justify-between gap-2 rounded-pill border border-brandDeep bg-brand/10 px-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40"
            onClick={() => {
              if (shippingOptions && shippingOptions.length > 0) {
                openDeliveryModal();
              } else {
                openLocationModal();
              }
            }}>
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true">🔥</span>
              <span className="line-clamp-1 text-body-sm font-normal">
                {hasSelection
                  ? `${selectedDelivery?.delivery_type} between ${selectedDelivery?.delivery_days}`
                  : "See delivery options"}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-brandDeep" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Return policy */}
      <div
        className={`flex flex-row items-center justify-between gap-3 ${returnRowClassName}`}>
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-foreground-primary" aria-hidden="true" />
          <p className="text-body-sm font-medium text-foreground-primary">Return policy</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-body-sm font-normal text-foreground-secondary">
            Free return within{" "}
            <span className="font-semibold text-foreground-primary">24hrs</span>
          </p>
          <AiOutlineInfoCircle size={18} className="text-foreground-secondary" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
