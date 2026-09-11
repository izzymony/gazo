/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { cn, formatCurrency, getMobileCompatibleImageUrl, PRODUCT_IMAGE_FALLBACK } from "@/lib/utils";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import { FaStar, FiUsers, ChevronRight, Heart, HeartFilled } from "@vibaar/ui/icons";
import ChipToggle from "@vibaar/ui/common/ChipToggle";
import IconButton from "@vibaar/ui/common/IconButton";
import useFollowVendor from "./useFollowVendor";

export interface VendorCardProduct {
  id?: string;
  title?: string;
  image?: string[];
  // The product types across the app allow null here, so accept it rather than
  // making every call site coerce.
  price?: number | string | null;
  old_price?: number | string | null;
  /** Whole-star rating; omitted or 0 when the product has none. */
  rating?: number;
}

interface VendorCardProps {
  /** The vendor's storefront. */
  href: string;
  /** Backend id — drives Follow. Omit and the control is hidden. */
  vendorId?: string;
  name: string;
  logo?: string;
  category?: string;
  rating?: number;
  followers?: number;
  /** Photo behind the card, usually one of the vendor's own product shots. */
  backgroundImage?: string;
  products: VendorCardProduct[];
  productHref: (product: VendorCardProduct) => string;
  savedProductIds?: (string | undefined)[];
  onSaveProduct?: (product: VendorCardProduct) => void;
  onPrefetch?: () => void;
  onPrefetchProduct?: (product: VendorCardProduct) => void;
  className?: string;
}

/**
 * VendorCard — a vendor and a taste of what they sell.
 *
 * The marketplace grid, the recently-viewed rail and the profile page's
 * "Vendors you follow" all show this card, and all three drew their own. The
 * marketplace's was real; the profile page's was a mock that had been wired to
 * live store names and never finished — it hardcoded the category ("fashion"),
 * the rating (5.4), the follower count (100k), every product's rating (4.5),
 * the logo and the card's background image, showed "Following" for vendors the
 * shopper did not follow, and its Follow button only mutated a local array. So
 * the same vendor read 5.4★/100k followers/Fashion on one screen and 0.0★/0/
 * Retail on the next.
 *
 * One card, real values, one follow implementation (`useFollowVendor`). A
 * vendor with no ratings shows none rather than inventing them.
 *
 * The card is a `<section>`, not a button: it CONTAINS buttons — Follow, each
 * product, each wishlist toggle — and nesting interactive elements inside a
 * button is invalid. The vendor's name is the link, stretched across the card
 * by a pseudo-element, so the whole tile activates while there is exactly one
 * focusable target with a real accessible name. The controls above it lift out
 * with `relative z-10`, the same pattern ProductCard uses.
 */
export default function VendorCard({
  href,
  vendorId,
  name,
  logo,
  category,
  rating,
  followers,
  backgroundImage,
  products,
  productHref,
  savedProductIds = [],
  onSaveProduct,
  onPrefetch,
  onPrefetchProduct,
  className,
}: VendorCardProps) {
  const { isFollowing, toggle, canFollow } = useFollowVendor(vendorId);
  const hasRating = Number(rating) > 0;
  const hasFollowers = Number(followers) > 0;

  return (
    <section
      aria-label={name}
      onMouseEnter={onPrefetch}
      onTouchStart={onPrefetch}
      className={cn(
        // FIXED height, at every breakpoint. A vendor with no preview products
        // used to collapse to a short card, so the recently-viewed rail scrolled
        // a row of different-height tiles past you. Cards in a set are one height.
        "relative mb-2 h-52 w-full overflow-hidden rounded-card bg-surface-inverse shadow-card transition-transform hover:scale-[1.01] hover:shadow-pop md:h-60 lg:h-64",
        className
      )}
      style={
        backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }>
      {/* Scrim, so white text reads over any vendor's photo. */}
      <div aria-hidden="true" className="absolute inset-0 bg-overlay/70" />

      {/* justify-between, so the slack a fixed height leaves falls BETWEEN the
          vendor's identity row and its product rail rather than under them. That
          gap is what made the original card feel taller; a flat `gap-3` closed it
          up and the card read cramped. */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between gap-4 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <StoreLogo src={logo} storeName={name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium capitalize text-white">
                <Link
                  href={href}
                  prefetch={false}
                  className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  {name}
                </Link>
              </p>
              {category && (
                <p className="truncate text-caption font-normal capitalize text-white/60">
                  {category}
                </p>
              )}
              {(hasRating || hasFollowers) && (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-caption font-normal text-white/60">
                  {hasRating && (
                    <span className="inline-flex items-center gap-1">
                      <FaStar size={10} aria-hidden="true" />
                      {Number(rating).toFixed(1)}
                      <span className="sr-only">average rating</span>
                    </span>
                  )}
                  {hasRating && hasFollowers && <span aria-hidden="true">·</span>}
                  {hasFollowers && (
                    <span className="inline-flex items-center gap-1">
                      <FiUsers size={10} aria-hidden="true" />
                      {followers}
                      <span className="sr-only">followers</span>
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-1">
            {canFollow && (
              <ChipToggle
                tone="onDark"
                selected={isFollowing}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle();
                }}>
                {isFollowing ? "Following" : "Follow"}
              </ChipToggle>
            )}
            <ChevronRight size={16} className="text-white" aria-hidden="true" />
          </div>
        </div>

        {products.length > 0 && (
          <ul className="flex list-none gap-3 overflow-x-auto scrollbar-hide pb-1">
            {products.map((product, index) => {
              const saved = savedProductIds.includes(product.id);
              const image = product.image?.[0]
                ? getMobileCompatibleImageUrl(product.image[0])
                : PRODUCT_IMAGE_FALLBACK;
              return (
                <li
                  key={product.id ?? index}
                  onMouseEnter={() => onPrefetchProduct?.(product)}
                  onTouchStart={() => onPrefetchProduct?.(product)}
                  className="relative z-10 flex w-48 shrink-0 items-center gap-2 rounded-field border border-white/20 bg-surface/10 p-2 backdrop-blur-md">
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-20 w-14 shrink-0 rounded-field border border-white/10 object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-1 text-caption font-normal text-white">
                      <Link
                        href={productHref(product)}
                        prefetch={false}
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                        {product.title}
                      </Link>
                    </p>
                    {Number(product.rating) > 0 && (
                      <span className="mt-0.5 flex items-center gap-1 text-micro text-white/80">
                        <FaStar size={10} className="text-brandDeep" aria-hidden="true" />
                        {product.rating}
                        <span className="sr-only">out of 5 stars</span>
                      </span>
                    )}
                    <div className="mt-1 flex items-end justify-between gap-2">
                      <div className="flex min-w-0 flex-col">
                        {product.old_price ? (
                          <span className="text-micro font-normal text-white/60 line-through">
                            {formatCurrency(+product.old_price)}
                          </span>
                        ) : null}
                        <span className="truncate text-body-sm font-medium text-white">
                          {formatCurrency(product.price ? +product.price : 0)}
                        </span>
                      </div>
                      {onSaveProduct && (
                        <IconButton
                          icon={saved ? HeartFilled : Heart}
                          label={
                            saved
                              ? `Remove ${product.title || "product"} from wishlist`
                              : `Add ${product.title || "product"} to wishlist`
                          }
                          variant="overlay"
                          size="sm"
                          iconSize={14}
                          aria-pressed={saved}
                          iconClassName={saved ? "text-brand" : "text-white"}
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            onSaveProduct(product);
                          }}
                          className="relative z-10 shrink-0"
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
