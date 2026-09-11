import { formatCurrency, calculateDiscountPercentage } from "@/lib/utils";
import StarRating from "@vibaar/ui/common/StarRating";
import Badge from "@vibaar/ui/common/Badge";
import IconButton from "@vibaar/ui/common/IconButton";
import { PiShareFatThin, Heart, HeartFilled, FaStar } from "@vibaar/ui/icons";

/**
 * Product title, share/wishlist actions, price and rating.
 *
 * The two actions were hand-drawn 36px inline SVGs — a share glyph and two
 * heart variants, ~90 lines of mask-and-path — wrapped in bare buttons. They
 * are the shared `IconButton` on the shared icon set now, which also gives them
 * the same hit area, hover and focus ring as every other icon control.
 *
 * The rating rendered `Array(n)` filled stars, so a 3-star product showed three
 * stars rather than three-of-five, and there was no text alternative at all.
 * It reads as a value out of five, with the number available to screen readers.
 */
export default function ProductInfo({
  title,
  price,
  oldPrice,
  sales,
  ratings,
  liked,
  onShare,
  onLike,
}: {
  title?: string;
  price: number;
  oldPrice?: string | number;
  sales?: string | number;
  ratings: number;
  liked: boolean;
  onShare: () => void;
  onLike: () => void;
}) {
  const oldPriceNum = oldPrice ? +oldPrice : 0;
  const salesNum = sales ? +sales : 0;
  const hasDiscount = oldPriceNum > price;

  return (
    <div className="w-full px-4 py-4 md:px-6 lg:px-0">
      <div className="flex flex-row items-start gap-2">
        {/* h1, and sized like one. It was `text-sm` — 14px — directly above a
            20px price, so the product's name was the smallest thing on its own
            page. */}
        <h1 className="mr-auto min-w-0 text-h2 font-medium text-foreground-primary">
          {title}
        </h1>
        <IconButton
          icon={PiShareFatThin}
          label="Share this product"
          onClick={onShare}
          className="bg-surface-subtle"
        />
        <IconButton
          icon={liked ? HeartFilled : Heart}
          label={liked ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={liked}
          onClick={onLike}
          className={liked ? "bg-brand/10 text-brandDeep" : "bg-surface-subtle"}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-h1 font-medium text-foreground-primary">
          {formatCurrency(price)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-body-sm font-normal text-foreground-muted line-through">
              {formatCurrency(oldPriceNum)}
            </span>
            <Badge tone="brand" variant="solid" className="ml-auto">
              {calculateDiscountPercentage(oldPriceNum, price)}% OFF
            </Badge>
          </>
        )}
      </div>

      {(ratings > 0 || salesNum > 0) && (
        <div className="mt-2 flex items-center gap-2 text-body-sm text-foreground-muted">
          {/* The shared five-star row — this was a sixth hand-rolled copy, and
              the only one still colouring its stars with the WARNING token. */}
          {ratings > 0 && <StarRating value={ratings} size="xs" />}
          {salesNum > 0 && <span>({salesNum} sold)</span>}
        </div>
      )}
    </div>
  );
}
