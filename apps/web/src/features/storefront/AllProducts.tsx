/* eslint-disable @next/next/no-img-element */
"use client";
import React from "react";
import { FaPlus } from "@vibaar/ui/icons";
import { useParams, usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Button from "@vibaar/ui/common/Button";
import Loader from "@vibaar/ui/common/Loader";
import useProductStore from "@/store/productStore";
import useOrderStore from "@/store/orderStore";
import { getMobileCompatibleImageUrl, PRODUCT_IMAGE_FALLBACK } from "@/lib/utils";
import { buildSimpleCartItem, productHasVariants, trackSimpleAddToCart } from "@/lib/cart";
import { ProductData } from "@/lib/types";
import useBusinessStore, { BusinessProduct } from "@/store/businessStore";
import { productPath } from "@/lib/urlHelpers";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import Spinner from "@vibaar/ui/common/Spinner";
import ProductCard from "./ProductCard";

export const truncateTextByLength = (
  text: string | undefined,
  charLimit: number
) => {
  return text && text?.length > charLimit
    ? text?.slice(0, charLimit) + "..."
    : text;
};

interface Props {
  /** The owner viewing their own catalogue, vs a shopper on a storefront. */
  isOwnerView?: boolean;
  filter?: string;
  searchValue?: string;
  sortToggle?: boolean;
  isNewStore?: boolean;
}

const AllProducts = ({
  isOwnerView,
  filter,
  searchValue,
  sortToggle,
  isNewStore = false,
}: Props) => {
  const router = useRouter();
  const path = usePathname();
  const { vendor } = useParams();
  const {
    products,
    spotlightProduct,
    addWishlist,
    loadMoreProducts,
    productsHasMore,
    productsLoadingMore,
  } = useProductStore();
  const { cart, addToCarts } = useOrderStore();
  const { businessProduct, isLoading: isLoadingBusinessProducts, stor } =
    useBusinessStore();

  const isDashboard = path.includes("/dashboard");
  const sellerProduct = isDashboard
    ? businessProduct
    : products.filter((item) => item.business_id === stor?.id);

  // Infinite scroll on the buyer storefront grid — append this vendor's next page
  // as the sentinel nears view. (Dashboard uses businessProduct, paginated elsewhere.)
  const sentinelRef = useInfiniteScroll(
    () => {
      if (stor?.id) loadMoreProducts(stor.id);
    },
    !isDashboard && productsHasMore
  );
  const prefetch = useRoutePrefetch();

  const handleProductClick = (item: ProductData | BusinessProduct) => {
    if (path.includes("/dashboard")) {
      router.push(`/dashboard/catalog/product/${item.id}`);
    } else {
      // URL rework: /store/{tag}/products/{slug}--{id} (tag from the resolved store).
      router.push(productPath(stor, item));
    }
  };

  const handleLikeClick = async (id: string) => {
    await addWishlist(id);
  };

  const handleAddToCart = (
    e: React.MouseEvent,
    item: ProductData | BusinessProduct
  ) => {
    e.stopPropagation();
    // Variant products can't be priced/added from a card — open the detail page.
    if (productHasVariants(item)) {
      handleProductClick(item);
      return;
    }
    addToCarts([buildSimpleCartItem(item), ...cart]);
    trackSimpleAddToCart(item);
    toast.success("Added to cart");
  };

  const filteredProducts = sellerProduct
    .filter((product: ProductData | BusinessProduct) => {
      // Buyer storefront search + tag filters are server-side (P16) — only the
      // dashboard preview still filters client-side over the loaded businessProduct list.
      const matchesCategory =
        !isDashboard || filter === "All" || product?.tag?.includes(filter ?? "");
      const matchesSearch =
        !isDashboard ||
        product?.title
          ?.toLowerCase()
          ?.includes(searchValue?.toLowerCase() ?? "") ||
        product?.description
          ?.toLowerCase()
          ?.includes(searchValue?.toLowerCase() ?? "");
      return matchesCategory && matchesSearch;
    })
    .sort(
      (a: ProductData | BusinessProduct, b: ProductData | BusinessProduct) => {
        if (!a.title || !b.title) return 0;
        return sortToggle
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
    );

  return (
    <>
      {path.includes("/dashboard") &&
        isLoadingBusinessProducts &&
        sellerProduct.length === 0 && (
          <div className="py-20">
            <Loader />
          </div>
        )}

      {filteredProducts?.length === 0 &&
        filter !== "All" &&
        !isLoadingBusinessProducts && (
          <EmptyState
            image="/images/emptystate/products_empty_state.svg"
            title="No products listed yet."
          />
        )}
      {filteredProducts?.length === 0 &&
      filter === "All" &&
      !isLoadingBusinessProducts ? (
        <EmptyState
          image="/images/emptystate/products_empty_state.svg"
          title="No products listed yet."
          subtitle={
            isNewStore
              ? "Your store is ready. Add your first product to start selling."
              : "This store has not listed any product yet."
          }>
          {isOwnerView && (
            <Button
              variant="filled"
              onClick={() => router.push("/dashboard/catalog/product/create")}
              className="max-w-max mt-2">
              <FaPlus className="mr-2" />
              {isNewStore ? "Add first product" : "Add a product to store"}
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 mx-auto px-2 md:px-4 pb-72 max-w-7xl">
          {filteredProducts.map(
            (item: ProductData | BusinessProduct, index: number) => {
              const rate =
                item.product_rating && item.product_rating.length > 0
                  ? Math.ceil(
                      item.product_rating.reduce((a, b) => a + b.rate, 0) /
                        item.product_rating.length
                    )
                  : 0;
              const spotlighted = spotlightProduct.some(
                (it) => it.product_id === item.id
              );
              const href = isDashboard
                ? `/dashboard/catalog/product/${item.id}`
                : productPath(stor, item);
              return (
                <ProductCard
                  key={item.id ?? index}
                  href={href}
                  title={item?.title || ""}
                  imageSrc={
                    item?.image
                      ? getMobileCompatibleImageUrl(item?.image[0])
                      : PRODUCT_IMAGE_FALLBACK
                  }
                  price={item?.price ? +item.price : 0}
                  oldPrice={item?.old_price ? +item.old_price : undefined}
                  rating={rate}
                  saved={spotlighted}
                  // Shopper actions, on the shopper's surface only. These were
                  // passed unconditionally, so a seller looking at their own
                  // storefront was offered "Add … to wishlist" and "Add … to
                  // cart" on their own products. The owner's action on a
                  // product is to open it — Edit and Share live there.
                  onSave={isDashboard ? undefined : () => handleLikeClick(item.id + "")}
                  onAddToCart={
                    isDashboard ? undefined : (event) => handleAddToCart(event, item)
                  }
                  onPrefetch={() => prefetch(href)}
                />
              );
            }
          )}
        </div>
      )}
      {!isDashboard && productsHasMore && (
        <div
          ref={sentinelRef}
          className="flex h-12 w-full items-center justify-center">
          {productsLoadingMore && (
            <Spinner className="text-foreground-muted" />
          )}
        </div>
      )}
    </>
  );
};

export default AllProducts;
