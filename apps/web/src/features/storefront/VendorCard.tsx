"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import { FaStar, FiUsers, ChevronRight, Heart, HeartFilled } from "@vibaar/ui/icons";
import ChipToggle from "@vibaar/ui/common/ChipToggle";
import IconButton from "@vibaar/ui/common/IconButton";
import ProductImage from "@/design-system/common/ProductImage";
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

  // Whether the product rail has run out of things to scroll to, so the
  // trailing fade can be dropped. Also true when everything already fits.
  const railRef = useRef<HTMLUListElement>(null);
  const [railAtEnd, setRailAtEnd] = useState(true);

  const measureRail = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    // 1px of slack: sub-pixel widths mean scrollLeft rarely lands exactly.
    setRailAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  // Measure once the row has laid out, and again if the card resizes — the
  // grid reflows at every breakpoint, and a row that fitted at one width
  // overflows at the next.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    measureRail();
    const ro = new ResizeObserver(measureRail);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureRail, products.length]);

  const handleRailScroll = measureRail;
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
        // `panel` (24), because this card HOLDS cards: 24 = the tile's 16 plus
        // the 8px inset between them. Radius is constant across breakpoints —
        // only the height grows — since a corner does not become a different
        // shape on a wider screen.
        "relative mb-2 h-52 w-full overflow-hidden rounded-panel bg-surface-inverse shadow-card transition-transform hover:scale-[1.01] hover:shadow-pop md:h-60 lg:h-64",
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
      {/* p-2 — the ONE inset, 8px, the same at every level of this card. It was
          12, which is what put the corners out of step: 8 between tile and
          image, 12 between card and tile. */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between gap-4 p-2">
        {/* px-2/pt-2 on top of the card's own p-2, so the vendor's logo sits
            16px from the card edge — exactly where a product thumbnail sits
            (8 for the card, 8 for the tile). The identity row and the products
            below it therefore share one left edge. */}
        <div className="flex items-start justify-between gap-3 px-2 pt-2">
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
          /* The rail spans the FULL card, not the padded column. `-mx-2`
             cancels the card's own inset so the row scrolls edge to edge;
             `pl-2` puts it back at the START only, so the first tile sits 8px
             in and its thumbnail lands 16px from the card edge — the same line
             the vendor's logo above it starts on.

             The trailing fade is a POSITIONED SIBLING, never a mask on the
             rail. A mask makes its element a backdrop root, so the frosted
             tiles inside could only sample what was painted within the rail —
             i.e. nothing — and `backdrop-blur` silently did nothing. It looked
             like the blur "only worked at the end" purely because that is when
             the mask came off. See the note in preset.cjs. */
          <div className="relative -mx-2">
          <ul
            ref={railRef}
            onScroll={handleRailScroll}
            className="flex list-none gap-2 overflow-x-auto scrollbar-hide pb-1 pl-2">
            {products.map((product, index) => {
              const saved = savedProductIds.includes(product.id);
              return (
                <li
                  key={product.id ?? index}
                  onMouseEnter={() => onPrefetchProduct?.(product)}
                  onTouchStart={() => onPrefetchProduct?.(product)}
                  // `card` (16) = the image's 8 plus the 8px `p-2` around it.
                  // Items STRETCH rather than centre, so the text column is as
                  // tall as the thumbnail and can pin its own contents to that
                  // height — centred, the title floated mid-image and the price
                  // sat above the image's bottom edge.
                  className="relative z-10 flex w-48 shrink-0 items-stretch gap-2 rounded-card border border-white/20 bg-surface/10 p-2 backdrop-blur-md">
                  {/* ProductImage, not a bare <img>: these URLs 404 whenever the
                      file was uploaded from another environment, and a broken
                      src draws the browser glyph. Only `onError` catches that. */}
                  <ProductImage
                    src={product.image}
                    className="h-20 w-14 shrink-0 rounded-media border border-white/10"
                  />
                  {/* justify-between against the 80px thumbnail: title to its
                      top edge, price row to its bottom. */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    {/* Title and its rating travel together at the TOP, so
                        `justify-between` has exactly two things to separate and
                        the price cannot drift upward when a product has no
                        rating. */}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-caption font-normal text-white">
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
                    </div>
                    {/* Price row sits on the thumbnail's bottom edge, with the
                        wishlist toggle on that same line. */}
                    <div className="flex items-end justify-between gap-2">
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
            {/* The "there is more" cue: a gradient laid OVER the rail's
                trailing edge, not a mask on it. Dropped once you reach the end
                (and when everything already fits), so it never dims the last
                product for nothing. It resolves to the card's own base colour;
                on a card carrying a vendor photo the true backdrop is that
                photo under a 70% scrim, which is near-identical but not exact. */}
            {!railAtEnd && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-surface-inverse"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
