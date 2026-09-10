
"use client";

import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Section from "@vibaar/ui/common/Section";
import ListItem from "@vibaar/ui/common/ListItem";
import Badge from "@vibaar/ui/common/Badge";
import ProductImage from "@/design-system/common/ProductImage";
import useBusinessStore, { BusinessProduct } from "@/store/businessStore";
import StatusBadge from "@/features/orders/StatusBadge";
import Link from "next/link";

interface ProductProps {
  product: BusinessProduct;
}

/**
 * One catalog row.
 *
 * It hand-rolled the `[thumb][title/detail][price]` skeleton that `ListItem`
 * exists to own — with six arbitrary values pinning the 60px thumbnail, a
 * `w-[100%]`, and three different spacing mechanisms (`gap-2`, `space-x-8`,
 * `gap-4`) inside one 82px row. The category chip was a bare `<span>` emitted
 * as a fourth sibling with no wrapper and no margin, which is why it hung below
 * the row instead of sitting in it; `Badge` is the chip primitive.
 *
 * The thumbnail's `src` fell back to `""` when a product had no image, and an
 * empty `src` renders the browser's BROKEN-IMAGE icon — which is what every
 * row without a photo was showing.
 */
const ProductComp: React.FC<ProductProps> = ({ product }: ProductProps) => (
  <ListItem
    className="relative items-center"
    trailingAlign="center"
    leading={
      <ProductImage
        src={product?.image}
        className="h-14 w-14 rounded-field border border-outline-subtle"
      />
    }
    title={
      <Link
        href={`/dashboard/catalog/product/${product?.id}`}
        className="font-medium after:absolute after:inset-0">
        {product?.title}
      </Link>
    }
    subtitle={
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Stock: {product?.stock ?? 0}</span>
        {product?.tag && product.tag.length > 0 && (
          <span>{product.tag.length} variants</span>
        )}
        {product?.category?.name && <Badge tone="neutral">{product.category.name}</Badge>}
      </span>
    }
    meta={`Last modified: ${formatDate(new Date(product?.created_at || Date.now()))}`}
    trailing={
      <span className="flex flex-col items-end gap-1">
        <span className="text-body font-medium text-foreground-primary">
          {formatCurrency(product?.price ? +product.price : 0)}
        </span>
        <StatusBadge status={product?.status === "active" ? "active" : "Draft"} />
      </span>
    }
  />
);

/**
 * The catalog's product list.
 *
 * The sort/search row it used to render itself now lives in the catalog page's
 * `Tabs generalContent`, beside the tab bar — the same slot analytics and the
 * storefront put theirs in. A control for a tab's contents belongs with the
 * tabs, not inside the panel, and having it in two different places is what
 * made the gap under the tab bar differ between these two screens.
 */
const Product = ({
  searchTerm = "",
  sortOrder = "ascending",
}: {
  searchTerm?: string;
  sortOrder?: "ascending" | "descending";
}) => {
  const { businessProduct } = useBusinessStore();

  const filteredProducts = businessProduct
    ?.filter(
      (product) =>
        product.title &&
        product.title.toLowerCase().includes(searchTerm?.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === "ascending" ? dateA - dateB : dateB - dateA;
    });

  return (
    <Section>
      {businessProduct.length > 0 ? (
        filteredProducts
          .reverse()
          ?.map((product, index) => <ProductComp key={index} product={product} />)
      ) : (
        <EmptyState
          image="/images/emptystate/products_empty_state.svg"
          title="No products yet."
          subtitle="Start by adding a product to your store."
        />
      )}
    </Section>
  );
};

export default Product;
