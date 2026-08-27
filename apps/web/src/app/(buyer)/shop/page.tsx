/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { storePath, productPath } from "@/lib/urlHelpers";
import { FaStar, Search, X, Heart, ShoppingCartAdd } from "@vibaar/ui/icons";
import Button from "@vibaar/ui/common/Button";
import useScroll from "@/hooks/useScroll";
import VendorNav from "@/features/storefront/VendorNav";
import img1 from "../../../../public/PRODUCT IMAGE (2).png";
import useBusinessStore from "@/store/businessStore";
import { useCategories } from "@/hooks/useCategories";
import { useRoutePrefetch } from "@/hooks/useRoutePrefetch";
import useProductStore from "@/store/productStore";
import { useRouter } from "next/navigation";
import SearchInput from "@/features/storefront/SearchInput";
// import logo from "../../../../public/images/vendor/logo1.png";
import HeaderSlides from "@vibaar/ui/common/HeaderSlides";
import { BusinessData, ProductData } from "@/lib/types";
import EmptyState from "@vibaar/ui/common/EmptyState";
import ExploreCard from "@/features/storefront/explorecard";
//import useScroll from "@/hooks/useScroll";
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
  const { isScrolled, addScrollListener } = useScroll(20);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [likedItems] = useState<number[]>([]);
  const {
    products,
    spotlightProduct,
    fetchRecentlyViewedBusiness,
    fetchWishlist,
    fetchAllProducts,
    addRecentViewed,
    addWishlist,
    recent,
  } = useProductStore();
  const { cart, addToCarts } = useOrderStore();

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
  const [loading, setLoadings] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<"loading" | "error" | "ready">("loading");
  const [search, setSearch] = useState(false);
  const [selected, setSelected] = useState<any>({});

  const { fetchGuestShippings, ensureGuestId } = useShippingStore();
  const { user } = useAuthStore();

  const {
    fetchStores,
    stores,
    store,
    setStore,
  } = useBusinessStore();
  const { categories } = useCategories(); // W2.5: single ["categories"] cache

  useEffect(() => {
    // Reuse the persisted guest-id (get-or-create); never regenerate it, or the
    // order a guest just placed becomes unreachable under a fresh id.
    if (!user?.id) {
      fetchGuestShippings(ensureGuestId());
    }
    // W2.4: no cleanup-refetch
  }, [user]);

  useEffect(() => {
    return () => {
      addScrollListener(scrollRef);
    };
  }, [addScrollListener]);

  const fetchAllData = useCallback(async () => {
    setLoadings(true);
    setFetchStatus("loading");
    try {
      await Promise.all([
        fetchStores(),
        fetchAllProducts(),
        // Per-user reads — only for signed-in buyers. For a guest these 401,
        // and (before the interceptor fix) that 401 hard-redirected them to
        // login, which is why guests couldn't even open /shop.
        ...(user ? [fetchRecentlyViewedBusiness(), fetchWishlist()] : []),
      ]);
      setFetchStatus("ready");
    } catch (error) {
      console.error("Error fetching data:", error);
      setFetchStatus("error");
    } finally {
      setLoadings(false);
    }
    // store actions are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleLikeClick = useCallback(async (id: string) => {
    //("ids clicked", id);
    await addWishlist(id);
  }, []);

  // Guard: Only group data when BOTH stores AND products are loaded
  // This prevents the race condition where products load before stores
  const isDataReady = stores.length > 0 && products.length > 0;

  const groupedData =
    isDataReady
      ? Object.values(
          products.reduce(
            (
              acc: Record<
                string,
                { business: string; products: ProductData[]; id: string }
              >,
              item
            ) => {
              const { business_id, ...productDetails } = item;
              if (business_id && !acc[business_id]) {
                acc[business_id] = {
                  business: business_id,
                  id: business_id,
                  products: [],
                };
              }
              if (business_id) {
                acc[business_id].products.push(productDetails);
              }
              return acc;
            },
            {}
          )
        )
      : [];

  // Generate session-consistent seed for stable background selection
  const sessionSeed = useMemo(() => generateSessionSeed(), []);

  // Create dynamic background map for all vendors (used by both recently viewed and all vendors sections)
  const allVendorsBackgroundMap = useMemo(() => {
    if (groupedData.length === 0 || !stores || stores.length === 0) {
      return new Map<string, string>();
    }

    const vendorsWithProducts = groupedData.map((store) => ({
      id: store.business,
      products: store.products || [],
    }));

    return createVendorBackgroundMap(vendorsWithProducts as unknown as Parameters<typeof createVendorBackgroundMap>[0], sessionSeed);
  }, [groupedData, stores, sessionSeed]);

  // Check for ID mismatches and provide detailed comparison
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

  const handleProductClick = (
    e: any,
    index: number,
    item: any,
    name: string
  ) => {
    e.stopPropagation();
    setLoadings(true);
    // Example navigation logic
    const selectedProduct = products[index];
    if (selectedProduct && selectedProduct.title) {
      router.push(
        productPath(getBusinessDetails(stores, selectedProduct.business_id || ""), {
          ...selectedProduct,
          id: item.product_id,
        })
      );
    }
    setLoadings(false);
  };

  // Shell paints immediately; the vendor grid skeletons while the fetches land.
  // (Was a full-page Loader gated on ALL 4 fetches — incl. the 500-business +
  // 250-product pulls — so the slowest blocked the entire first paint.) (Perf P2.)

  // Fetch failed — show a retryable error instead of an infinite spinner.
  if (fetchStatus === "error") {
    return (
      <div ref={scrollRef} className="w-full overflow-y-scroll scrollbar-hide">
        <div className="w-full flex flex-col mb-0">
          <HeaderSlides />
          <div className="rounded-t-2xl -mt-4 pb-10 z-20 bg-white shadow-lg px-4 pt-8 min-h-[50vh] flex flex-col items-center justify-center gap-4 max-w-full lg:max-w-5xl lg:mx-auto text-center">
            <EmptyState
              image="/images/emptystate/products_empty_state.svg"
              title="Couldn't load vendors"
              subtitle="Something went wrong. Check your connection and try again."
            />
            <Button
              onClick={() => fetchAllData()}
              className="max-w-[max-content]">
              Try again
            </Button>
          </div>
        </div>
        <VendorNav />
      </div>
    );
  }

  // Loaded but no vendors found
  if (fetchStatus === "ready" && groupedData.length === 0) {
    return (
      <div ref={scrollRef} className="w-full overflow-y-scroll scrollbar-hide">
        <div className="w-full flex flex-col mb-0">
          <HeaderSlides />
          <div className="rounded-t-2xl -mt-4 pb-10 z-20 bg-white shadow-lg px-4 pt-8 min-h-[50vh] flex items-center justify-center max-w-full lg:max-w-5xl lg:mx-auto">
            <EmptyState
              image="/images/emptystate/products_empty_state.svg"
              title="No vendors found"
              subtitle="Check back later for new vendors or try a different search"
            />
          </div>
        </div>
        <VendorNav />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="w-full overflow-y-scroll scrollbar-hide">
      <div className="w-full flex flex-col mb-0">
        <HeaderSlides />
        <div className="rounded-t-2xl -mt-4 pb-10 z-20 bg-white shadow-lg px-2 md:px-4 lg:px-6 pt-2 md:pt-4 lg:pt-6 max-w-full lg:max-w-5xl lg:mx-auto">
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
          <div className="gap-2 w-full pe-1 flex items-center bg-white sticky top-0 z-30 border-b border-ink-10">
            {!search && !searchTerm ? (
              <div className="gap-2 py-1 w-full flex items-center">
                <div className="flex flex-1 gap-2 items-center my-2 overflow-x-scroll scrollbar-hide">
                  {categories.map((it) => (
                    <div
                      onClick={() => setSelected(selected.id ? {} : it)}
                      key={it.id}
                      className={
                        it.name === selected.name
                          ? "py-2 px-4 bg-ink-90 rounded-full text-white text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                          : "py-2 px-4 bg-ink-3 rounded-full text-ink-90 text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                      }>
                      <p className="whitespace-nowrap">{it.name}</p>
                      {it.name === selected.name && (
                        <div
                          className="z-modal cursor-pointer"
                          onClick={() => setSelected({})}>
                          <X size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isScrolled && (
                  <div
                    className="py-2 px-2 bg-ink-3 rounded-full text-ink-90 text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                    onClick={() => setSearch(!search)}>
                    <Search size={16} className="text-ink-90" />
                  </div>
                )}
              </div>
            ) : search && isScrolled ? (
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
                      onClick={() => setSelected(selected.id ? {} : it)}
                      key={it.id}
                      className={
                        it.name === selected.name
                          ? "py-2 px-4 bg-ink-90 rounded-full text-white text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                          : "py-2 px-4 bg-ink-3 rounded-full text-ink-90 text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                      }>
                      <p className="whitespace-nowrap">{it.name}</p>
                      {it.name === selected.name && (
                        <div
                          className="z-modal cursor-pointer"
                          onClick={() => setSelected({})}>
                          <X size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isScrolled && (
                  <div
                    className="py-2 px-2 bg-ink-3 rounded-full text-ink-90 text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                    onClick={() => setSearch(!search)}>
                    <Search size={16} className="text-ink-90" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-full overflow-y-scroll scrollbar-hide">
            <div className=" ">
              {/* Recently viewed vendors - using unified groupedData */}
              {(() => {
                // Get recently viewed business IDs from recent array
                const recentlyViewedIds = new Set(recent.map(item => item.business_id));

                // Filter groupedData to show only recently viewed vendors
                const recentlyViewedVendors = groupedData.filter(store =>
                  recentlyViewedIds.has(store.business)
                );

                return recentlyViewedVendors.length > 0 && (
                  <div className="mb-5 px-2">
                    <div className="flex justify-between items-center my-4">
                      <p className="font-medium text-body md:text-body-lg">
                        Recently viewed vendors
                      </p>
                      <p
                        onClick={() => router.push("/shop/recently-viewed")}
                        className="text-caption md:text-body-sm font-medium text-brand cursor-pointer hover:underline">
                        See all
                      </p>
                    </div>
                    <div className="overflow-x-auto scrollbar-hide">
                      <div className="flex gap-4 px-0">
                        {recentlyViewedVendors.map((store) => {
                          const businessDetails = getBusinessDetails(stores, store.business);

                          return (
                            <div key={store.id} className="w-[340px] md:w-[400px] lg:w-[450px] flex-shrink-0">
                              <ExploreCard
                                cardAction={() => {
                                  if (businessDetails) {
                                    setStore(businessDetails);
                                  }

                                  const vendorPath = storePath(businessDetails);
                                  router.push(vendorPath);
                                }}
                                onPrefetch={() => prefetch(storePath(businessDetails))}
                                onPrefetchProduct={(item) =>
                                  prefetch(productPath(businessDetails, item))
                                }
                                smallCardAction={(e, item) => {
                                  setLoadings(true);
                                  e.stopPropagation();
                                  router.push(
                                    productPath(businessDetails, item)
                                  );
                                }}
                                likedItems={likedItems}
                                handleLikeClick={(ite) => handleLikeClick(ite)}
                                image={img1.src}
                                bussinessName={businessDetails?.name || ""}
                                category={businessDetails?.category || ""}
                                id={store.business}
                                store={store.products}
                                vendorTheme={{
                                  backgroundColor: businessDetails?.business_setting?.personalised_settings?.background_color,
                                  backgroundImage: businessDetails?.business_setting?.personalised_settings?.background_image,
                                  backgroundType: businessDetails?.business_setting?.personalised_settings?.background_state,
                                }}
                                businessDetails={{
                                  logo: businessDetails?.logo as string | undefined,
                                  followers_count: businessDetails?.followers_count,
                                  average_rating: businessDetails?.average_rating,
                                }}
                                dynamicBackgroundImage={allVendorsBackgroundMap.get(store.business)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* All products spotlight */}

              {spotlightProduct.length > 0 && (
                <div className="mb-5 px-2">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-medium text-body md:text-body-lg">My wishlists</p>
                    <p
                      onClick={() => router.push("")}
                      className="text-caption md:text-body-sm font-medium text-brand cursor-pointer hover:underline">
                      See all
                    </p>
                  </div>
                  <div className="overflow-x-auto md:overflow-visible scrollbar-hide">
                    <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                      {spotlightProduct.map((item, index) => {
                        //("items=>>zz=> ", item);
                        if (!item.product) return null;
                        
                        const businessDetails = getBusinessDetails(
                          stores,
                          item.product.business_id
                        );
                        return (
                          <div
                            key={index}
                            className="cursor-pointer relative min-w-[148px]"
                            onClick={(e) =>
                              handleProductClick(
                                e,
                                index,
                                item,
                                businessDetails?.name + ""
                              )
                            }>
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
                            <span
                              className="absolute top-2 right-4 h-9 w-9 flex justify-center items-center rounded-full bg-black/20 backdrop-blur-sm cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeClick(item.id);
                              }}>
                              <Heart size={18} className="text-white" />
                            </span>
                            <span
                              onClick={(e) => handleAddToCart(e, item)}
                              className="absolute bottom-14 right-4 h-9 w-9 flex justify-center items-center rounded-full cursor-pointer bg-black/30 backdrop-blur-sm">
                              <ShoppingCartAdd size={18} className="text-white" />
                            </span>
                            <p className="text-caption font-medium mt-2">
                              {truncateTextByLength(item.product.title, 30)}
                            </p>
                            <p className="text-caption text-ink-20 font-medium line-through">
                              ₦{item?.product.old_price?.toLocaleString()}
                            </p>
                            <div className="flex justify-between">
                              <p className="text-body-sm font-medium">
                                ₦{item?.product.price?.toLocaleString()}
                              </p>
                              <div className="flex gap-2">
                                <FaStar size={12} className="text-warning" />
                                <p className="text-caption text-ink-40">
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

              {/* Explore vendors */}

              <div className="mb-5 overflow-y-scroll scrollbar-hide">
                <div className="flex justify-between items-center py-3 px-2">
                  <h1 className="font-medium text-body md:text-body-lg">
                    Explore social media vendors
                  </h1>
                  <p
                    onClick={() => router.push("/shop/spotlights")}
                    className="text-brand font-medium text-caption md:text-body-sm cursor-pointer hover:underline">
                    View spotlights
                  </p>
                </div>

                <div className="gap-4 md:gap-6 px-2 overflow-y-scroll scrollbar-hide md:grid md:grid-cols-2 lg:grid-cols-2">
                  {fetchStatus === "loading"
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-56 rounded-card bg-ink-3 animate-pulse"
                        />
                      ))
                    : selected.id
                    ? groupedData
                        .filter((it) => {
                          const businessDetails = getBusinessDetails(
                            stores,
                            it.business
                          );
                          return selected.name === businessDetails?.category;
                        })
                        // Remove duplicates based on business ID
                        .filter((store, index, self) => 
                          index === self.findIndex((s) => s.business === store.business)
                        )
                        .map(
                          (store: {
                            business: string;
                            products: ProductData[];
                            id: string;
                          }) => {
                            const businessDetails = getBusinessDetails(
                              stores,
                              store.business
                            );
                            
                            // Skip stores with no business details for now
                            if (!businessDetails) {
                              return null;
                            }

                            return (
                              <ExploreCard
                                key={store.business}
                                cardAction={async () => {
                                  if (!businessDetails || !businessDetails.name) {
                                    return;
                                  }

                                  // Set store immediately and ensure it's set
                                  setStore(businessDetails);

                                  // Navigate immediately for better UX
                                  const vendorPath = storePath(businessDetails);
                                  router.push(vendorPath);

                                  // Add to recent viewed in background (non-blocking)
                                  addRecentViewed(
                                    { business_ids: [store.id] },
                                    () => fetchRecentlyViewedBusiness()
                                  ).catch(error => {
                                    console.error("Error adding to recent viewed:", error);
                                  });
                                }}
                                onPrefetch={() => prefetch(storePath(businessDetails))}
                                onPrefetchProduct={(item) =>
                                  prefetch(productPath(businessDetails, item))
                                }
                                smallCardAction={(e, item) => {
                                  addRecentViewed(
                                    { business_ids: [store.id] },
                                    () => fetchRecentlyViewedBusiness()
                                  );
                                  setLoadings(true);
                                  e.stopPropagation();
                                  if (businessDetails) {
                                    router.push(
                                      productPath(businessDetails, item)
                                    );
                                  }
                                  // setLoadings(false);
                                }}
                                likedItems={likedItems}
                                handleLikeClick={(ite) => handleLikeClick(ite)}
                                image={img1.src}
                                bussinessName={businessDetails?.name as string}
                                category={businessDetails?.category as string}
                                id={
                                  businessDetails?.id ? businessDetails.id : ""
                                }
                                store={store.products}
                                vendorTheme={{
                                  backgroundColor: businessDetails?.business_setting?.personalised_settings?.background_color,
                                  backgroundImage: businessDetails?.business_setting?.personalised_settings?.background_image,
                                  backgroundType: businessDetails?.business_setting?.personalised_settings?.background_state,
                                }}
                                businessDetails={{
                                  logo: businessDetails?.logo as string | undefined,
                                  followers_count: businessDetails?.followers_count,
                                  average_rating: businessDetails?.average_rating,
                                }}
                                dynamicBackgroundImage={allVendorsBackgroundMap.get(store.business)}
                              />
                            );
                          }
                        )
                    : groupedData
                        // Remove duplicates based on business ID
                        .filter((store, index, self) => 
                          index === self.findIndex((s) => s.business === store.business)
                        )
                        .map(
                        (store: {
                          business: string;
                          products: ProductData[];
                          id: string;
                        }) => {
                          const businessDetails = getBusinessDetails(
                            stores,
                            store.business
                          );
                          
                          // Skip stores with no business details for now
                          if (!businessDetails) {
                            return null;
                          }

                          return (
                            <ExploreCard
                              key={store.business}
                              cardAction={async () => {
                                if (!businessDetails || !businessDetails.name) {
                                  return;
                                }

                                // Set store immediately and ensure it's set
                                setStore(businessDetails);

                                // Navigate immediately for better UX
                                const vendorPath = storePath(businessDetails);
                                router.push(vendorPath);

                                // Add to recent viewed in background (non-blocking)
                                addRecentViewed(
                                  { business_ids: [store.id] },
                                  () => fetchRecentlyViewedBusiness()
                                ).catch(error => {
                                  console.error("Error adding to recent viewed:", error);
                                });
                              }}
                              onPrefetch={() => prefetch(storePath(businessDetails))}
                              onPrefetchProduct={(item) =>
                                prefetch(productPath(businessDetails, item))
                              }
                              smallCardAction={(e, item) => {
                                addRecentViewed(
                                  { business_ids: [store.id] },
                                  () => fetchRecentlyViewedBusiness()
                                );
                                setLoadings(true);
                                e.stopPropagation();
                                if (businessDetails) {
                                  router.push(
                                    productPath(businessDetails, item)
                                  );
                                }
                                // setLoadings(false);
                              }}
                              likedItems={likedItems}
                              handleLikeClick={(ite) => handleLikeClick(ite)}
                              image={img1.src}
                              bussinessName={businessDetails?.name as string}
                              category={businessDetails?.category as string}
                              id={businessDetails?.id ? businessDetails.id : ""}
                              store={store.products}
                              vendorTheme={{
                                backgroundColor: businessDetails?.business_setting?.personalised_settings?.background_color,
                                backgroundImage: businessDetails?.business_setting?.personalised_settings?.background_image,
                                backgroundType: businessDetails?.business_setting?.personalised_settings?.background_state,
                              }}
                              businessDetails={{
                                logo: businessDetails?.logo as string | undefined,
                                followers_count: businessDetails?.followers_count,
                                average_rating: businessDetails?.average_rating,
                              }}
                              dynamicBackgroundImage={allVendorsBackgroundMap.get(store.business)}
                            />
                          );
                        }
                      )}
                </div>
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
