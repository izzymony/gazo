/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { storePath, productPath } from "@/lib/urlHelpers";
import { FaStar, Search, X, Heart, ShoppingCartAdd } from "@vibaar/ui/icons";
import Button from "@vibaar/ui/common/Button";
import useScroll from "@/hooks/useScroll";
import VendorNav from "@/features/storefront/VendorNav";
import img1 from "../../../../public/PRODUCT IMAGE (2).png";
import useBusinessStore from "@/store/businessStore";
import { useCategories } from "@/hooks/useCategories";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import useProductStore from "@/store/productStore";
import { useRouter } from "next/navigation";
import SearchInput from "@/features/storefront/SearchInput";
import HeaderSlides from "@vibaar/ui/common/HeaderSlides";
import { BusinessData } from "@/lib/types";
import EmptyState from "@vibaar/ui/common/EmptyState";
import VendorCard from "@/features/storefront/VendorCard";
import useShippingStore from "@/store/shippingStore";
import useAuthStore from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { toast } from "sonner";
import { buildSimpleCartItem, productHasVariants, trackSimpleAddToCart } from "@/lib/cart";
import { getMobileCompatibleImageUrl } from "@/lib/utils";
import {
  generateSessionSeed,
  createVendorBackgroundMap
} from "@/utils/vendorBackgroundHelper";

type BusinessDetails = (
  data: BusinessData[],
  businessId: string
) => BusinessData | null;

const truncateTextByLength = (text: string | undefined, charLimit: number) => {
  return text && text?.length > charLimit
    ? text?.slice(0, charLimit) + "..."
    : text;
};

const Page: React.FC = () => {
  const router = useRouter();
  const prefetch = useRoutePrefetch();
  const { isScrolled, scrollRef } = useScroll(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [likedItems] = useState<number[]>([]);
  const {
    spotlightProduct,
    fetchRecentlyViewedBusiness,
    fetchWishlist,
    addRecentViewed,
    addWishlist,
    recent,
  } = useProductStore();
  const { cart, addToCarts } = useOrderStore();

  const [loading, setLoadings] = useState(false);
  const [search, setSearch] = useState(false);
  const [selected, setSelected] = useState<any>({});

  const { fetchGuestShippings, ensureGuestId } = useShippingStore();
  const { user } = useAuthStore();

  const {
    // Vendor directory — kept ONLY for the wishlist + recently-viewed
    // business-detail lookups (logo / rating) via getBusinessDetails below.
    // Now bounded (backend PaginationGuard clamps limit to 100). The P16
    // marketplace grid itself no longer touches this (it uses the /shop/vendors
    // feed). (P16 EXCEPTION — tracked: enrich wishlist items server-side to drop it.)
    fetchStores,
    stores,
    setStore,
    // P16 marketplace discovery feed (server search + category, infinite scroll).
    shopVendors,
    shopVendorsLoading,
    shopVendorsLoadingMore,
    shopVendorsHasMore,
    shopVendorsError,
    fetchShopVendors,
    loadMoreShopVendors,
  } = useBusinessStore();
  const { categories } = useCategories(); // W2.5: single ["categories"] cache

  const selectedName: string = selected?.name || "";

  const handleAddToCart = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const product = { ...item.product, id: item.id };
    // Variant products can't be priced/added from a card — open the detail page.
    if (productHasVariants(product)) {
      router.push(
        productPath(getBusinessDetails(stores, item.product.business_id), product)
      );
      return;
    }
    addToCarts([buildSimpleCartItem(product), ...cart]);
    trackSimpleAddToCart(product);
    toast.success("Added to cart");
  };

  useEffect(() => {
    // Reuse the persisted guest-id (get-or-create); never regenerate it, or the
    // order a guest just placed becomes unreachable under a fresh id.
    if (!user?.id) {
      fetchGuestShippings(ensureGuestId());
    }
  }, [user]);

  // Secondary sections' data: the vendor directory (for wishlist/recently-viewed
  // logo lookups) + the per-user wishlist & recently-viewed lists. The marketplace
  // grid is fetched separately by the debounced feed effect below.
  useEffect(() => {
    fetchStores();
    if (user) {
      fetchWishlist();
      fetchRecentlyViewedBusiness();
    }
  }, [user]);

  // Marketplace feed: (re)fetch page 1 whenever the category chip or search term
  // changes. Typing is debounced; category selection / initial mount fire
  // immediately. The store's request-id guard drops any out-of-order response.
  useEffect(() => {
    const term = searchTerm.trim();
    const t = setTimeout(
      () => {
        fetchShopVendors({ category: selectedName, search: term });
      },
      term ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [searchTerm, selectedName]);

  const handleLikeClick = useCallback(async (id: string) => {
    await addWishlist(id);
  }, []);

  // Generate session-consistent seed for stable background selection
  const sessionSeed = useMemo(() => generateSessionSeed(), []);

  // Dynamic card background per vendor, derived from that vendor's product images.
  // Built from the feed's preview strips + the recently-viewed products (both carry
  // products) so every rendered card resolves a stable image.
  const backgroundMap = useMemo(() => {
    const feed = shopVendors.map((v) => ({
      id: v.id,
      products: v.preview_products || [],
    }));
    const rec = recent.map((r) => ({
      id: r.business_id,
      products: r.products || [],
    }));
    const combined = [...feed, ...rec];
    if (combined.length === 0) return new Map<string, string>();
    return createVendorBackgroundMap(
      combined as unknown as Parameters<typeof createVendorBackgroundMap>[0],
      sessionSeed
    );
  }, [shopVendors, recent, sessionSeed]);

  const getBusinessDetails: BusinessDetails = (
    data: BusinessData[],
    businessId: string
  ) => {
    if (!Array.isArray(data) || !businessId) {
      return null;
    }
    const business = data.find((item) => item.id === businessId);
    return business || null;
  };

  // Wishlist / spotlight product click — navigates to the product detail page.
  // Uses the item's own embedded product (no dependency on a broad product pull);
  // resolves the vendor tag from the kept directory.
  const handleProductClick = (e: any, item: any) => {
    e.stopPropagation();
    const p = item?.product;
    if (p && p.title) {
      router.push(
        productPath(getBusinessDetails(stores, p.business_id || ""), {
          ...p,
          id: item.product_id,
        })
      );
    }
  };

  // Infinite-scroll sentinel for the marketplace grid. loadMoreShopVendors
  // self-guards while loading / when exhausted.
  const sentinelRef = useInfiniteScroll(loadMoreShopVendors, shopVendorsHasMore);

  // Feed failed with nothing to show — retryable error instead of an empty page.
  if (shopVendorsError && shopVendors.length === 0) {
    return (
      <div ref={scrollRef} className="w-full h-full overflow-y-scroll scrollbar-hide">
        <div className="w-full flex flex-col mb-0">
          <HeaderSlides />
          <div className="rounded-t-2xl -mt-4 pb-10 z-20 bg-surface shadow-lg px-4 pt-8 min-h-[50vh] flex flex-col items-center justify-center gap-4 max-w-full lg:max-w-5xl lg:mx-auto text-center">
            <EmptyState
              image="/images/emptystate/products_empty_state.svg"
              title="Couldn't load vendors"
              subtitle="Something went wrong. Check your connection and try again."
            />
            <Button
              onClick={() =>
                fetchShopVendors({
                  category: selectedName,
                  search: searchTerm.trim(),
                })
              }
              className="max-w-[max-content]">
              Try again
            </Button>
          </div>
        </div>
        <VendorNav />
      </div>
    );
  }

  return (
    // h-full is what makes this scroll. The buyer frame is `h-dvh
    // overflow-hidden`, and this element had no height at all: it grew to its
    // content, so `overflow-y-scroll` had nothing to scroll and the frame simply
    // clipped everything below the fold. Nothing on the marketplace past the
    // first screen was reachable — and useInfiniteScroll ignores a container
    // whose scrollHeight equals its clientHeight, so it rooted on the viewport
    // and its sentinel, being clipped, never came into view either.
    <div ref={scrollRef} className="w-full h-full overflow-y-scroll scrollbar-hide">
      <div className="w-full flex flex-col mb-0">
        <HeaderSlides />
        <div className="rounded-t-2xl -mt-4 pb-10 z-20 bg-surface shadow-lg px-2 md:px-4 lg:px-6 pt-2 md:pt-4 lg:pt-6 max-w-full lg:max-w-5xl lg:mx-auto">
          {!isScrolled && (
            <SearchInput
              showSearch={true}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              action={() => {
                setSearch(!search);
                setSearchTerm("");
              }}
            />
          )}
          <div className="gap-2 w-full pe-1 flex items-center bg-surface sticky top-0 z-30 border-b border-outline">
            {search && isScrolled ? (
              <SearchInput
                showSearch={true}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                action={() => {
                  setSearch(!search);
                  setSearchTerm("");
                }}
              />
            ) : (
              <div className="gap-2 py-1 w-full flex items-center">
                <div className="flex flex-1 gap-2 items-center my-2 overflow-x-scroll scrollbar-hide">
                  {categories.map((it) => (
                    <div
                      onClick={() =>
                        setSelected(selectedName === it.name ? {} : it)
                      }
                      key={it.id}
                      className={
                        it.name === selectedName
                          ? "py-2 px-4 bg-surface-inverse rounded-full text-white text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                          : "py-2 px-4 bg-surface-subtle rounded-full text-foreground-primary text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                      }>
                      <p className="whitespace-nowrap">{it.name}</p>
                      {it.name === selectedName && (
                        <button type="button" aria-label="Clear selected category"
                          className="text-left z-modal cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected({});
                          }}>
                          <X size={12} className="text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {isScrolled && (
                  <button type="button" aria-label="Search"
                    className="text-left py-2 px-2 bg-surface-subtle rounded-full text-foreground-primary text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                    onClick={() => setSearch(!search)}>
                    <Search size={16} className="text-foreground-primary" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Plain wrapper: the page scroller above owns scrolling. */}
          <div>
            <div className=" ">
              {/* Recently viewed vendors — rendered from the per-user `recent`
                  list (it carries { business, products }); no broad product pull. */}
              {recent.length > 0 && (
                <div className="mb-5 px-2">
                  <div className="flex justify-between items-center my-4">
                    <p className="font-medium text-body md:text-body-lg">
                      Recently viewed vendors
                    </p>
                    <button type="button"
                      onClick={() => router.push("/shop/recently-viewed")}
                      className="text-left text-caption md:text-body-sm font-medium text-brandDeep cursor-pointer hover:underline">
                      See all
                    </button>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-4 px-0">
                      {recent.map((r) => {
                        // Prefer the full directory record (logo / rating); fall back
                        // to the business embedded in the recent entry.
                        const details =
                          getBusinessDetails(stores, r.business_id) ||
                          (r.business as any);

                        return (
                          <div
                            key={r.id}
                            className="w-[340px] md:w-[400px] lg:w-[450px] flex-shrink-0">
                            <VendorCard
                              href={storePath(details)}
                              vendorId={r.business_id}
                              name={details?.name || ""}
                              logo={details?.logo as string | undefined}
                              category={details?.category}
                              rating={details?.average_rating}
                              followers={details?.followers_count}
                              backgroundImage={backgroundMap.get(r.business_id)}
                              products={(r.products || []).map((item: any) => ({
                                id: item.id,
                                title: item.title,
                                image: item.image,
                                price: item.price,
                                old_price: item.old_price,
                                rating: item.product_rating?.length
                                  ? Math.round(
                                      item.product_rating.reduce(
                                        (a: number, b: { rate: number }) => a + b.rate,
                                        0
                                      ) / item.product_rating.length
                                    )
                                  : 0,
                              }))}
                              productHref={(product) => productPath(details, product)}
                              savedProductIds={spotlightProduct.map((sp) => sp.product_id)}
                              onSaveProduct={(product) =>
                                product.id && addWishlist(product.id)
                              }
                              onPrefetch={() => {
                                if (details) setStore(details);
                                prefetch(storePath(details));
                              }}
                              onPrefetchProduct={(item) =>
                                prefetch(productPath(details, item))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* My wishlists */}
              {spotlightProduct.length > 0 && (
                <div className="mb-5 px-2">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-medium text-body md:text-body-lg">My wishlists</p>
                    <button type="button"
                      onClick={() => router.push("")}
                      className="text-left text-caption md:text-body-sm font-medium text-brandDeep cursor-pointer hover:underline">
                      See all
                    </button>
                  </div>
                  <div className="overflow-x-auto md:overflow-visible scrollbar-hide">
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                      {spotlightProduct.map((item, index) => {
                        if (!item.product) return null;

                        return (
                          <div
                            key={index}
                            className="cursor-pointer relative min-w-[148px]"
                            onClick={(e) => handleProductClick(e, item)}>
                            <img
                              src={
                                item?.product.image
                                  ? getMobileCompatibleImageUrl(item?.product.image[0])
                                  : "/PRODUCT IMAGE (2).png"
                              }
                              alt={item.product.title ?? ""}
                              className="w-[140px] h-[140px] object-cover rounded-card"
                              width={140}
                              height={140}
                            />
                            <button type="button" aria-label="Add to wishlist"
                              className="text-left absolute top-2 right-4 h-9 w-9 flex justify-center items-center rounded-full bg-black/20 backdrop-blur-sm cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeClick(item.id);
                              }}>
                              <Heart size={18} className="text-white" />
                            </button>
                            <button type="button" aria-label="Add to cart"
                              onClick={(e) => handleAddToCart(e, item)}
                              className="text-left absolute bottom-14 right-4 h-9 w-9 flex justify-center items-center rounded-full cursor-pointer bg-black/30 backdrop-blur-sm">
                              <ShoppingCartAdd size={18} className="text-white" />
                            </button>
                            <p className="text-caption font-medium mt-2">
                              {truncateTextByLength(item.product.title, 30)}
                            </p>
                            <p className="text-caption text-foreground-disabled font-medium line-through">
                              ₦{item?.product.old_price?.toLocaleString()}
                            </p>
                            <div className="flex justify-between">
                              <p className="text-body-sm font-medium">
                                ₦{item?.product.price?.toLocaleString()}
                              </p>
                              <div className="flex gap-2">
                                <FaStar size={12} className="text-warning-foreground" />
                                <p className="text-caption text-foreground-muted">
                                  {item.product.weight}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Explore vendors — P16 marketplace discovery feed */}
              <div className="mb-5">
                <div className="flex justify-between items-center py-3 px-2">
                  <h1 className="font-medium text-body md:text-body-lg">
                    Explore social media vendors
                  </h1>
                  <button type="button"
                    onClick={() => router.push("/shop/spotlights")}
                    className="text-left text-brandDeep font-medium text-caption md:text-body-sm cursor-pointer hover:underline">
                    View spotlights
                  </button>
                </div>

                <div className="gap-4 md:gap-6 px-2 md:grid md:grid-cols-2 lg:grid-cols-2">
                  {shopVendorsLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-56 rounded-card bg-surface-subtle animate-pulse"
                        />
                      ))
                    : shopVendors.map((v) => (
                        <VendorCard
                          key={v.id}
                          href={storePath(v)}
                          vendorId={v.id}
                          name={v.name}
                          logo={v.logo}
                          category={v.category}
                          rating={v.average_rating}
                          followers={v.followers_count}
                          backgroundImage={backgroundMap.get(v.id)}
                          products={(v.preview_products || []).map((item: any) => ({
                            id: item.id,
                            title: item.title,
                            image: item.image,
                            price: item.price,
                            old_price: item.old_price,
                            // `rates` is just the scores. The feed used to send
                            // each preview product's whole record — associations
                            // and all — and `variants` alone was 7.9MB of a
                            // 7.8MB page, which could not arrive inside the
                            // client's timeout on a 3G connection.
                            rating: item.rates?.length
                              ? Math.round(
                                  item.rates.reduce((a: number, b: number) => a + b, 0) /
                                    item.rates.length
                                )
                              : 0,
                          }))}
                          productHref={(product) => productPath(v, product)}
                          savedProductIds={spotlightProduct.map((sp) => sp.product_id)}
                          onSaveProduct={(product) => product.id && addWishlist(product.id)}
                          onPrefetch={() => {
                            prefetch(storePath(v));
                            // Record the view in the background (non-blocking).
                            addRecentViewed({ business_ids: [v.id] }, () =>
                              fetchRecentlyViewedBusiness()
                            ).catch((error) => {
                              console.error("Error adding to recent viewed:", error);
                            });
                          }}
                          onPrefetchProduct={(item) => prefetch(productPath(v, item))}
                                                />
                      ))}
                </div>

                {/* Loaded but nothing matched (empty catalog or a filtered search). */}
                {!shopVendorsLoading &&
                  !shopVendorsError &&
                  shopVendors.length === 0 && (
                    <div className="py-10 flex items-center justify-center">
                      <EmptyState
                        image="/images/emptystate/products_empty_state.svg"
                        title="No vendors found"
                        subtitle={
                          searchTerm || selectedName
                            ? "Try a different search or category"
                            : "Check back later for new vendors"
                        }
                      />
                    </div>
                  )}

                {/* Infinite-scroll sentinel + next-page loader */}
                {shopVendorsHasMore && (
                  <div
                    ref={sentinelRef}
                    className="py-6 flex items-center justify-center">
                    {shopVendorsLoadingMore && (
                      <div className="grid grid-cols-2 gap-4 md:gap-6 w-full px-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-56 rounded-card bg-surface-subtle animate-pulse"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <VendorNav />
    </div>
  );
};

export default Page;
