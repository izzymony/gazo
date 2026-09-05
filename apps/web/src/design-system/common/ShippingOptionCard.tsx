"use client";
import React, { useState } from "react";
import { cn, formatCurrency, parseAmount } from "@/lib/utils";
import { CircleCheck, DeliveryTruck } from "@vibaar/ui/icons";
import type { ShippingOptionInfo } from "@/store/shippingStore";

interface ShippingOptionCardProps {
  option: ShippingOptionInfo;
  selected: boolean;
  onSelect: () => void;
}

/**
 * One delivery option — a real courier or the seller's own (Self) delivery.
 * Shared by the product delivery sheet and the order-review delivery sheet
 * (Shipping D-C). Renders whatever rich fields are present and degrades
 * gracefully: a truck icon when there's no courier logo, and no badge row when
 * the flags are absent (common on sandbox data).
 */
const ShippingOptionCard: React.FC<ShippingOptionCardProps> = ({
  option,
  selected,
  onSelect,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const pd = option.provider_data?.[0];
  const isSelf = option.provider === "self" || pd?.self === true;

  const name = option.delivery_type || pd?.courier_name || "Delivery";
  const logo = isSelf ? "" : pd?.courier_image || "";

  // Speed tag: same-day when the courier is on-demand, else the ETA range.
  const speedTag = pd?.on_demand
    ? "⚡ Same-day"
    : option.delivery_days || pd?.delivery_eta || "";

  // Self options are tagged with the delivery zone they cover, so the buyer sees
  // which of the seller's own-delivery options applies to their address.
  const zoneLabel = !isSelf
    ? ""
    : pd?.zone === "interstate"
      ? "Interstate"
      : pd?.zone === "international"
        ? "International"
        : pd?.zone === "local"
          ? pd?.seller_state
            ? `Within ${pd.seller_state}`
            : "Local"
          : "Seller delivery";

  // Trust badges — only what's actually present.
  const badges: string[] = [];
  if (isSelf && zoneLabel) badges.push(zoneLabel);
  if (!isSelf && (pd?.tracking_level ?? 0) > 0) badges.push("Tracked");
  if (pd?.is_cod_available) badges.push("Pay on delivery");
  if ((pd?.insurance?.fee ?? 0) > 0) badges.push("Insured");

  // Price: option.price is already the discounted amount; show the struck
  // original only when a real discount applies.
  const original = pd?.rate_card_amount ?? 0;
  const discounted = pd?.discount?.discounted ?? 0;
  const showStruck = !isSelf && discounted > 0 && original > discounted;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left border rounded-card p-3 flex gap-3 items-start transition-colors",
        selected ? "border-brandDeep bg-brand/10" : "border-outline bg-surface"
      )}>
      {/* Courier logo, or a truck fallback */}
      <div className="shrink-0 w-10 h-10 rounded-field bg-surface-subtle flex items-center justify-center overflow-hidden">
        {logo && !logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- courier logos come from arbitrary external hosts; next/image can't enumerate them
          <img
            src={logo}
            alt={name}
            loading="lazy"
            onError={() => setLogoFailed(true)}
            className="w-full h-full object-contain"
          />
        ) : (
          <DeliveryTruck size={20} className="text-foreground-secondary" />
        )}
      </div>

      {/* Name + speed tag + subtitle + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-body font-medium text-foreground-primary">{name}</p>
          {speedTag && (
            <span className="text-caption px-2 py-0.5 rounded-pill bg-surface-subtle text-foreground-secondary">
              {speedTag}
            </span>
          )}
        </div>
        {option.description && (
          <p className="text-body-sm text-foreground-secondary mt-0.5">{option.description}</p>
        )}
        {badges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {badges.map((b) => (
              <span
                key={b}
                className="text-caption px-2 py-0.5 rounded-pill bg-surface-subtle text-foreground-secondary">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price + selected check */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        {selected && <CircleCheck size={18} className="text-brandDeep" />}
        <p className="text-body font-medium text-foreground-primary">
          {formatCurrency(parseAmount(option.price))}
        </p>
        {showStruck && (
          <p className="text-caption text-foreground-muted line-through">
            {formatCurrency(original)}
          </p>
        )}
      </div>
    </button>
  );
};

export default ShippingOptionCard;
