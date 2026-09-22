/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import EmptyState from "@vibaar/ui/common/EmptyState";
import ReviewCard from "@vibaar/ui/common/ReviewCard";
import StarRating from "@vibaar/ui/common/StarRating";
import Badge from "@vibaar/ui/common/Badge";
import FilterBar from "@vibaar/ui/common/FilterBar";
import DropdownSelect from "@vibaar/ui/common/DropdownSelect";
import { formatCurrency, getMobileCompatibleImageUrl } from "@/lib/utils";
import ProductImage from "@/design-system/common/ProductImage";

/**
 * The storefront's Deals and Reviews tabs.
 *
 * Both were `<EmptyState title="No deals listed yet." />` and
 * `"No reviews listed yet."` — literal, unconditional, on BOTH surfaces. So a
 * store with three discounted products and a dozen five-star reviews told its
 * own owner it had neither, while `product_rating` was arriving attached to
 * every product in the same payload.
 *
 * Each tab also owns ITS OWN controls. The storefront put one `VendorDataSort`
 * in the tab bar's shared row, so the product TAG pills ("All", "as") sat above
 * Deals and above Reviews too — filters that cannot apply to what is under
 * them. A control belongs to the thing it controls.
 */

export const DEAL_SORTS = ["Biggest discount", "Newest", "Price: low to high"] as const;
export type DealSort = (typeof DEAL_SORTS)[number];

export const REVIEW_FILTERS = ["All", "5", "4", "3", "2", "1"] as const;

const productHref = (product: any, storeTag?: string) => {
  if (!storeTag || !product?.public_id) return null;
  const slug =
    product?.slug ||
    String(product?.title ?? "product")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `/@${storeTag}/p/${slug}-${product.public_id}`;
};

const isDeal = (item: any) => {
  const price = Number(item?.price ?? 0);
  const was = Number(item?.old_price ?? 0);
  return was > 0 && price > 0 && was > price;
};

const discountPct = (item: any) => {
  const price = Number(item.price);
  const was = Number(item.old_price);
  return Math.round(((was - price) / was) * 100);
};

/**
 * The Deals tab's own control row: how to order them. Tag pills here would be
 * the Products tab's filter wearing the wrong label.
 */
export function DealsControls({
  sort,
  onSortChange,
}: {
  sort: DealSort;
  onSortChange: (value: DealSort) => void;
}) {
  return (
    <FilterBar
      sticky={false}
      showSearch={false}
      showSort={false}
      className="px-4 md:px-6 lg:px-8"
      ariaLabel="Sort deals"
      leading={
        <DropdownSelect
          options={[...DEAL_SORTS]}
          value={sort}
          onSelect={(value) => onSortChange(value as DealSort)}
          ariaLabel="Sort deals"
        />
      }
    />
  );
}

/** The Reviews tab's own control row: filter by score. */
export function ReviewsControls({
  filter,
  onFilterChange,
}: {
  filter: string;
  onFilterChange: (value: string) => void;
}) {
  const pills = REVIEW_FILTERS.map((f) => (f === "All" ? "All" : `${f} ★`));
  const index = REVIEW_FILTERS.indexOf(filter as (typeof REVIEW_FILTERS)[number]);
  return (
    <FilterBar
      sticky={false}
      showSearch={false}
      showSort={false}
      className="px-4 md:px-6 lg:px-8"
      ariaLabel="Filter reviews by rating"
      pills={pills}
      activePill={Math.max(0, index)}
      onPillChange={(i) => onFilterChange(REVIEW_FILTERS[i])}
    />
  );
}

export function StoreDeals({
  products,
  storeTag,
  sort = "Biggest discount",
}: {
  products: any[];
  storeTag?: string;
  sort?: DealSort;
}) {
  // A deal is a product marked down from a higher price — the same definition
  // the product card uses for its struck-through was-price.
  const deals = products.filter(isDeal).sort((a, b) => {
    if (sort === "Newest") {
      return new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime();
    }
    if (sort === "Price: low to high") return Number(a.price) - Number(b.price);
    return discountPct(b) - discountPct(a);
  });

  if (deals.length === 0) {
    return (
      <EmptyState
        image="/images/emptystate/discount_empty_state.svg"
        title="No deals right now"
        subtitle="Products marked down from their usual price show up here."
      />
    );
  }

  return (
    <ul className="grid list-none grid-cols-2 gap-3 px-4 md:grid-cols-3 md:px-6 lg:grid-cols-4 lg:px-8">
      {deals.map((item, index) => {
        const href = productHref(item, storeTag);
        const body = (
          <>
            <div className="relative">
              <ProductImage src={item?.image} className="aspect-square w-full rounded-card" />
              <Badge tone="brand" variant="solid" className="absolute left-2 top-2">
                {discountPct(item)}% off
              </Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-body-sm text-foreground-primary">
              {item.title}
            </p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span className="text-body font-medium text-foreground-primary">
                {formatCurrency(Number(item.price))}
              </span>
              <span className="text-caption text-foreground-muted line-through">
                {formatCurrency(Number(item.old_price))}
              </span>
            </p>
          </>
        );

        return (
          <li key={item.id ?? index}>
            {href ? (
              <Link href={href} prefetch={false} className="block">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function StoreReviews({
  products,
  filter = "All",
}: {
  products: any[];
  filter?: string;
}) {
  // Every review of every product in the store, newest first. `is_blocked` is
  // moderation — a review taken down is not shown.
  const all = products
    .flatMap((item) =>
      (item?.product_rating ?? [])
        .filter((r: any) => !r?.is_blocked)
        .map((r: any) => ({ ...r, product: item }))
    )
    .sort(
      (a: any, b: any) =>
        new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime()
    );

  const reviews =
    filter === "All"
      ? all
      : all.filter((r: any) => Math.round(Number(r?.rate ?? 0)) === Number(filter));

  if (all.length === 0) {
    return (
      <EmptyState
        image="/images/emptystate/activity_empty_state.svg"
        title="No reviews yet"
        subtitle="Reviews shoppers leave on this store's products appear here."
      />
    );
  }

  // The store's score is the WHOLE set, not the filtered view — a filter
  // narrows what you read, it does not change the store's rating.
  const average =
    all.reduce((sum: number, r: any) => sum + Number(r?.rate ?? 0), 0) / all.length;

  return (
    <div className="flex flex-col gap-3 px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <StarRating value={Math.round(average)} size="sm" />
        <p className="text-body-sm text-foreground-secondary">
          {average.toFixed(1)} · {all.length} {all.length === 1 ? "review" : "reviews"}
        </p>
      </div>

      {reviews.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-foreground-muted">
          No {filter}-star reviews yet.
        </p>
      ) : (
        reviews.map((review: any, index: number) => (
          <ReviewCard
            key={review.id ?? index}
            rating={review.rate}
            comment={review.comment}
            date={review.created_at}
            // The store list says WHAT was reviewed; it still cannot say who
            // reviewed it, because the API carries only a `user_id`.
            subject={{
              title: review.product?.title,
              imageUrl: review.product?.image?.[0]
                ? getMobileCompatibleImageUrl(review.product.image[0])
                : undefined,
            }}
          />
        ))
      )}
    </div>
  );
}
