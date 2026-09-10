/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import EmptyState from "@vibaar/ui/common/EmptyState";
import ReviewCard from "@vibaar/ui/common/ReviewCard";
import StarRating from "@vibaar/ui/common/StarRating";
import Badge from "@vibaar/ui/common/Badge";
import { formatCurrency, getMobileCompatibleImageUrl } from "@/lib/utils";
import ProductImage from "@/design-system/common/ProductImage";

/**
 * The storefront's Deals and Reviews tabs.
 *
 * Both were `<EmptyState title="No deals listed yet." />` and
 * `"No reviews listed yet."` — literal, unconditional, on BOTH surfaces. So a
 * store with three discounted products and a dozen five-star reviews told its
 * own owner it had neither, and the reviews tab said nothing while
 * `product_rating` was arriving attached to every single product in the same
 * payload. Neither tab ever queried anything; there was nothing to query.
 *
 * Both are derived from the products the storefront has already loaded. No new
 * request, and an empty state that now means the store is genuinely empty.
 */

const productHref = (product: any, storeTag?: string) => {
  if (!storeTag || !product?.public_id) return null;
  const slug = product?.slug || String(product?.title ?? "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `/@${storeTag}/p/${slug}-${product.public_id}`;
};

export function StoreDeals({
  products,
  storeTag,
}: {
  products: any[];
  storeTag?: string;
}) {
  // A deal is a product marked down from a higher price. `old_price` is the
  // was-price the product card already strikes through, so this is the same
  // definition the grid uses rather than a second one.
  const deals = products.filter((item) => {
    const price = Number(item?.price ?? 0);
    const was = Number(item?.old_price ?? 0);
    return was > 0 && price > 0 && was > price;
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
        const price = Number(item.price);
        const was = Number(item.old_price);
        const off = Math.round(((was - price) / was) * 100);
        const body = (
          <>
            <div className="relative">
              <ProductImage src={item?.image} className="aspect-square w-full rounded-card" />
              <Badge tone="brand" variant="solid" className="absolute left-2 top-2">
                {off}% off
              </Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-body-sm text-foreground-primary">
              {item.title}
            </p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span className="text-body font-medium text-foreground-primary">
                {formatCurrency(price)}
              </span>
              <span className="text-caption text-foreground-muted line-through">
                {formatCurrency(was)}
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

export function StoreReviews({ products }: { products: any[] }) {
  // Every review of every product in the store, newest first. `is_blocked` is
  // moderation — a review taken down is not shown.
  const reviews = products
    .flatMap((item) =>
      (item?.product_rating ?? [])
        .filter((r: any) => !r?.is_blocked)
        .map((r: any) => ({ ...r, product: item }))
    )
    .sort(
      (a: any, b: any) =>
        new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime()
    );

  if (reviews.length === 0) {
    return (
      <EmptyState
        image="/images/emptystate/activity_empty_state.svg"
        title="No reviews yet"
        subtitle="Reviews shoppers leave on this store's products appear here."
      />
    );
  }

  const average =
    reviews.reduce((sum: number, r: any) => sum + Number(r?.rate ?? 0), 0) / reviews.length;

  return (
    <div className="flex flex-col gap-3 px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <StarRating value={Math.round(average)} size="sm" />
        <p className="text-body-sm text-foreground-secondary">
          {average.toFixed(1)} · {reviews.length}{" "}
          {reviews.length === 1 ? "review" : "reviews"}
        </p>
      </div>

      {reviews.map((review: any, index: number) => (
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
      ))}
    </div>
  );
}
