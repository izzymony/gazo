/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Heart, ShoppingCartAdd, FaStar } from "@vibaar/ui/icons";
import { formatCurrency } from "@vibaar/utils";

interface ProductCardProps {
  href: string;
  title: string;
  imageSrc: string;
  price: number;
  /** Struck-through original price. Omitted when there is no discount. */
  oldPrice?: number;
  /** Whole-star rating, 0 when a product has no ratings yet. */
  rating?: number;
  /** Already in the shopper's wishlist / spotlights. */
  saved?: boolean;
  onSave?: () => void;
  onAddToCart?: (event: React.MouseEvent) => void;
  /** Warm the destination on hover or touch-start. */
  onPrefetch?: () => void;
  className?: string;
}

/**
 * ProductCard — the marketplace's product tile.
 *
 * The single most repeated unit in the buyer experience, and it had never been
 * a component: it lived as ~70 lines of markup inside the grid that rendered
 * it, so it could not be documented, tested, or reused by any other surface.
 *
 * The card was a `<div onClick={router.push}>` while the two controls INSIDE it
 * were already real buttons — so you could tab to "Add to cart" but not to the
 * product it belonged to. The title is now a link, stretched across the card by
 * a pseudo-element, which makes the whole tile clickable exactly as before
 * while giving it one focusable target with a real accessible name. The save
 * and cart buttons sit above that overlay, so they keep working on their own.
 */
export default function ProductCard({
  href,
  title,
  imageSrc,
  price,
  oldPrice,
  rating = 0,
  saved = false,
  onSave,
  onAddToCart,
  onPrefetch,
  className,
}: ProductCardProps) {
  return (
    <article className={cn("group relative", className)}>
      <div className="gap-2 items-center flex flex-col transition-transform hover:scale-[1.02]">
        <div className="relative w-full aspect-square rounded-field lg:rounded-card overflow-hidden">
          <img
            src={imageSrc}
            alt=""
            className="w-full h-full object-cover shadow-sm group-hover:shadow-md transition-shadow"
          />
          {/* `relative z-10` lifts these above the title's stretched overlay,
              so tapping them does not navigate to the product. */}
          {onSave && (
            <button
              type="button"
              aria-label={saved ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
              aria-pressed={saved}
              onClick={(event) => {
                event.stopPropagation();
                onSave();
              }}
              className="absolute top-1 right-2 z-10 h-9 w-9 flex justify-center items-center rounded-full bg-overlay/15 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Heart size={20} className={saved ? "text-brandDeep" : "text-white"} />
            </button>
          )}
          {onAddToCart && (
            <button
              type="button"
              aria-label={`Add ${title} to cart`}
              onClick={onAddToCart}
              className="absolute bottom-2 right-2 z-10 h-9 w-9 flex justify-center items-center rounded-full bg-surface/20 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40">
              <ShoppingCartAdd size={20} className="text-brandDeep" />
            </button>
          )}
        </div>

        <div className="w-full">
          <p className="text-caption w-full line-clamp-1 font-medium">
            <Link
              href={href}
              prefetch={false}
              onMouseEnter={onPrefetch}
              onTouchStart={onPrefetch}
              // The pseudo-element is what makes the whole card clickable while
              // there is still exactly one link to focus and announce.
              className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 rounded-sm">
              {title}
            </Link>
          </p>
          {oldPrice ? (
            <p className="text-caption text-foreground-muted font-medium line-through">
              {formatCurrency(oldPrice)}
            </p>
          ) : null}
          <div className="flex justify-between">
            <p className="text-caption font-medium">{formatCurrency(price)}</p>
            <div className="flex gap-1 items-center">
              <FaStar size={12} className="text-brandDeep" aria-hidden="true" />
              <p className="text-caption text-foreground-muted">
                {rating}
                <span className="sr-only"> out of 5 stars</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
