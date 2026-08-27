/* eslint-disable @next/next/no-img-element */
"use client";
import React from "react";
import { FaPlus, Heart, ShoppingCartAdd, FaStar } from "@vibaar/ui/icons";
import { useParams, usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Button from "@vibaar/ui/common/Button";
import Loader from "@vibaar/ui/common/Loader";
import useProductStore from "@/store/productStore";
import useOrderStore from "@/store/orderStore";
import { formatCurrency, getMobileCompatibleImageUrl } from "@/lib/utils";
import { buildSimpleCartItem, productHasVariants, trackSimpleAddToCart } from "@/lib/cart";
import { ProductData } from "@/lib/types";
import useBusinessStore, { BusinessProduct } from "@/store/businessStore";
import { productPath } from "@/lib/urlHelpers";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";

export const truncateTextByLength = (
  text: string | undefined,
  charLimit: number
) => {
  return text && text?.length > charLimit
    ? text?.slice(0, charLimit) + "..."
    : text;
};

interface Props {
  isSeller?: {
    seller?: boolean;
    pro?: boolean;
  };
  filter?: string;
  searchValue?: string;
  sortToggle?: boolean;
  isNewStore?: boolean;
}

const AllProducts = ({
  isSeller,
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
      const matchesCategory =
        filter === "All" || product?.tag?.includes(filter ?? "");
      const matchesSearch =
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
          {isSeller?.seller && (
            <Button
              variant="filled"
              onClick={() => router.push("/dashboard/catalog/product/create")}
              className="max-w-[max-content] !mt-2">
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
                <div key={index} className="cursor-pointer group">
                  <div
                    className="gap-2 items-center flex flex-col transition-transform hover:scale-[1.02]"
                    onClick={() => handleProductClick(item)}
                    onMouseEnter={() => prefetch(href)}
                    onTouchStart={() => prefetch(href)}>
                    <div className="relative w-full aspect-square rounded-field lg:rounded-card overflow-hidden">
                      <img
                        src={
                          item?.image
                            ? getMobileCompatibleImageUrl(item?.image[0])
                            : "/PRODUCT IMAGE (2).png"
                        }
                        alt={item?.title || ""}
                        className="w-full h-full object-cover shadow-sm group-hover:shadow-md transition-shadow"
                      />
                      <button
                        aria-label="Add to wishlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikeClick(item.id + "");
                        }}
                        className="absolute top-1 right-2 h-9 w-9 flex justify-center items-center rounded-full bg-black/15 backdrop-blur-sm">
                        <Heart
                          size={20}
                          className={spotlighted ? "text-brand" : "text-white"}
                        />
                      </button>
                      <button
                        aria-label="Add to cart"
                        onClick={(e) => handleAddToCart(e, item)}
                        className="absolute bottom-2 right-2 h-9 w-9 flex justify-center items-center rounded-full bg-white/20 backdrop-blur-sm">
                        <ShoppingCartAdd size={20} className="text-brand" />
                      </button>
                    </div>

                    <div className="w-full">
                      <p className="text-caption w-full line-clamp-1 font-medium">
                        {item?.title}
                      </p>
                      <p className="text-caption text-ink-40 font-medium line-through">
                        {formatCurrency(item?.old_price ? +item.old_price : 0)}
                      </p>
                      <div className="flex justify-between">
                        <p className="text-caption font-medium">
                          {formatCurrency(item?.price ? +item.price : 0)}
                        </p>
                        <div className="flex gap-1 items-center">
                          <FaStar size={12} className="text-warning" />
                          <p className="text-caption text-ink-40">{rate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          )}
        </div>
      )}
    </>
  );
};

export default AllProducts;
