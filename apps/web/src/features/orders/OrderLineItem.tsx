import { cn, formatCurrency } from "@/lib/utils";

/**
 * A product line in an order: thumbnail, name, optional variant, price × qty.
 *
 * This exact block was written out five times across three screens — the buyer
 * order list (twice), the buyer order detail (twice) and the seller order
 * detail — with the same 60px thumbnail and the same price/quantity row. The
 * copies had already drifted: some carried `border-ink-10`, some a bare
 * `border`, and the variant line appeared in three of the five.
 *
 * Callers keep their own image-URL logic (the list runs it through
 * getMobileCompatibleImageUrl) and pass the resolved src.
 */
export default function OrderLineItem({
  image,
  name,
  price,
  quantity,
  variant,
  bordered = false,
  className,
}: {
  /** Resolved image URL. Falls back to the product placeholder when empty. */
  image?: string;
  name: string;
  price: number;
  quantity: number;
  /** e.g. "Red / Large". Omitted when the product has no variants. */
  variant?: string;
  /** Detail screens box the line; the list renders it flush inside its own card. */
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full space-x-3",
        bordered && "rounded-field border border-outline p-2",
        className
      )}>
      <img
        src={image || "/PRODUCT IMAGE (2).png"}
        alt={name}
        className="h-[60px] w-[60px] rounded-field border border-outline object-cover"
      />
      <div className="flex flex-1 flex-col justify-between">
        <p className="text-body-sm font-normal text-foreground-primary">{name}</p>
        {variant && (
          <p className="text-body-sm font-medium text-foreground-muted">{variant}</p>
        )}
        <div className="flex space-x-4 text-body-sm font-medium text-foreground-secondary">
          <p>{formatCurrency(price)}</p>
          <p className="text-foreground-primary">x {quantity}</p>
        </div>
      </div>
    </div>
  );
}
