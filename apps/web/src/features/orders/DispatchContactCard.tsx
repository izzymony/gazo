import React from "react";
import { DeliveryTruck, User, Call } from "@vibaar/ui/icons";

/**
 * Read-only dispatch-contact card for Self-delivery orders. The seller records
 * this at "out for delivery"; both the seller and buyer order pages render it so
 * the buyer can reach the rider. Renders nothing until there's a contact, so it
 * can be dropped into either page unconditionally.
 */
export default function DispatchContactCard({
  name,
  phone,
  note,
  eta,
  onEdit,
}: {
  name?: string;
  phone?: string;
  note?: string;
  eta?: string;
  /** Seller-only: renders an "Edit" affordance in the header. */
  onEdit?: () => void;
}) {
  if (!name && !phone && !note) return null;
  return (
    <div className="border border-outline rounded-card p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <DeliveryTruck size={18} className="text-foreground-primary shrink-0" />
        <p className="text-body-sm font-medium text-foreground-primary">Delivery contact</p>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto text-caption font-medium text-brandDeep">
            Edit
          </button>
        ) : eta ? (
          <span className="ml-auto text-caption text-foreground-secondary">{eta}</span>
        ) : null}
      </div>
      {name && (
        <div className="flex items-center gap-2">
          <User size={16} className="text-foreground-secondary shrink-0" />
          <p className="text-body-sm text-foreground-primary">{name}</p>
        </div>
      )}
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-2">
          <Call size={16} className="text-brandDeep shrink-0" />
          <p className="text-body-sm font-medium text-brandDeep">{phone}</p>
        </a>
      )}
      {note && <p className="text-caption text-foreground-secondary">{note}</p>}
    </div>
  );
}
