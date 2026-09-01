/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import MainLayout from "@/design-system/mainLayout";
import { BusinessData, ProductData } from "@/lib/types";
import { storePath, productPath } from "@/lib/urlHelpers";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { FaStar, FiUsers, IoIosArrowForward } from "@vibaar/ui/icons";
import img1 from "../../../../../public/PRODUCT IMAGE (2).png";
import WishlistComponent from "./wishlistcomponent";

const Page = () => {
  const router = useRouter();
  const [isFollowed, setIsFollowed] = useState<string[]>([]);
  const [likedItems] = useState<number[]>([]);
  const {
    products,
    isLoading,
    spotlightProduct,
    fetchAllProducts,
    fetchRecentlyViewedBusiness,
    fetchWishlist,
    addRecentViewed,
    addWishlist,
    recent,
    // setSpotlightProduct,
  } = useProductStore();
  const [likedStates, setLikedStates] = useState<boolean[]>(
    Array(products.length).fill(false)
  );
  const [loading, setLoading] = useState(true); // To track loading state
  const [currentBusinessIndex, setCurrentBusinessIndex] = useState<number>(0); // Index for the current business
  const [loadingProgress, setLoadingProgress] = useState<number>(0); // Progress bar state
  const [showProducts, setShowProducts] = useState<boolean>(true); // To control visibility of products
  const [isPaused, setIsPaused] = useState<boolean>(false); // To pause auto-scroll
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true); // To enable/disable auto-scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    fetchStores,
    stores,
    store,
    isLoading: isLoadingBusiness,
    setStore,
  } = useBusinessStore();

  useEffect(() => {
    // Fetch this page's own data. /shop no longer populates the global product
    // list (it moved to the paginated /shop/vendors feed), so spotlights must
    // pull products itself or it renders empty. These are backend-filtered to
    // active + in-stock. (Follow-up: rebuild spotlights on the vendor feed.)
    fetchStores();
    fetchAllProducts();
  }, [fetchStores, fetchAllProducts, store?.id]);

  const groupedData = Object.values(
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
  );

  // Instagram Stories-like auto-scroll functionality
  useEffect(() => {
    if (!autoScrollEnabled || isPaused || !groupedData.length) return;

    const storyDuration = 5000; // 5 seconds per story
    const progressIncrement = 100 / (storyDuration / 50); // Update every 50ms

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        const newProgress = prev + progressIncrement;
        
        if (newProgress >= 100) {
          // Story completed, move to next
          setTimeout(() => {
            scrollToNextStory();
          }, 100);
          return 100;
        }
        
        return newProgress;
      });
    }, 50);

    return () => {
      clearInterval(progressInterval);
    };
  }, [currentBusinessIndex, autoScrollEnabled, isPaused, groupedData.length]);

  // Function to scroll to next story
  const scrollToNextStory = () => {
    const nextIndex = (currentBusinessIndex + 1) % Math.min(groupedData.length, 5);
    setCurrentBusinessIndex(nextIndex);
    setLoadingProgress(0);
    
    // Scroll to the next card
    if (scrollContainerRef.current) {
      const cardHeight = window.innerHeight - 120; // Approximate card height
      const targetScrollTop = nextIndex * (cardHeight + 16); // Include margin
      
      scrollContainerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  };

  // Function to scroll to previous story
  const scrollToPreviousStory = () => {
    const prevIndex = currentBusinessIndex === 0 
      ? Math.min(groupedData.length, 5) - 1 
      : currentBusinessIndex - 1;
    setCurrentBusinessIndex(prevIndex);
    setLoadingProgress(0);
    
    // Scroll to the previous card
    if (scrollContainerRef.current) {
      const cardHeight = window.innerHeight - 120;
      const targetScrollTop = prevIndex * (cardHeight + 16);
      
      scrollContainerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  };


  const getBusinessDetails = (data: BusinessData[], businessId: string) => {
    if (!Array.isArray(data) || !businessId) {
      return null;
    }

    const business = data.find((item) => item.id === businessId);
    return business || null;
  };

  // Create a stable session seed that doesn't change during component lifecycle
  const sessionSeed = useMemo(() => {
    const today = new Date().getDate(); // Changes daily
    return Math.abs(Math.floor(today * 1000 + Math.random() * 1000)) % 10000;
  }, []); // Empty dependency array - only calculated once per component mount

  // Memoized background images that stay consistent for each store during the session
  const stableBackgroundImages = useMemo(() => {
    const backgroundMap = new Map<string, string>();
    
    groupedData.forEach((store, index) => {
      const storeProducts = store.products;
      const storeId = store.business;
      
      if (!storeProducts || storeProducts.length === 0) {
        backgroundMap.set(storeId, "/images/bg.avif");
        return;
      }

      // Filter products that have images
      const productsWithImages = storeProducts.filter(product => 
        product.image && product.image.length > 0
      );

      if (productsWithImages.length === 0) {
        backgroundMap.set(storeId, "/images/bg.avif");
        return;
      }

      // Sort by multiple performance criteria
      const topProducts = productsWithImages.sort((a, b) => {
        const priceA = parseFloat(a.price?.toString() || "0");
        const priceB = parseFloat(b.price?.toString() || "0");
        
        // Calculate rating score (if available)
        const ratingA = a.product_rating ? 
          a.product_rating.reduce((acc, rating) => acc + rating.rate, 0) / a.product_rating.length : 0;
        const ratingB = b.product_rating ? 
          b.product_rating.reduce((acc, rating) => acc + rating.rate, 0) / b.product_rating.length : 0;
        
        // Composite score: 60% price weight + 40% rating weight
        const scoreA = (priceA * 0.6) + (ratingA * 20 * 0.4);
        const scoreB = (priceB * 0.6) + (ratingB * 20 * 0.4);
        
        return scoreB - scoreA; // Descending order
      });

      // Take top 60% of products for variety
      const topPerformingCount = Math.max(1, Math.ceil(topProducts.length * 0.6));
      const topPerformingProducts = topProducts.slice(0, topPerformingCount);

      // Use stable session seed + store index for consistent randomization
      const storeSpecificSeed = Math.abs((sessionSeed + index * 137)) % topPerformingProducts.length;
      const selectedProduct = topPerformingProducts[storeSpecificSeed];
      
      // Additional safety check to ensure selectedProduct exists
      if (selectedProduct && selectedProduct.image && selectedProduct.image.length > 0) {
        backgroundMap.set(storeId, selectedProduct.image[0]);
      } else {
        backgroundMap.set(storeId, "/images/bg.avif");
      }
    });
    
    return backgroundMap;
  }, [groupedData, sessionSeed]); // Only recalculate when groupedData or sessionSeed changes

  const handleProductClick = (
    index: number,
    businessName: string,
    id: string
  ) => {
    // Example navigation logic
    const selectedProduct = products[index];
    if (selectedProduct && selectedProduct.title) {
      // router.push(
      //   `/products/${selectedProduct.title.replace(/\s+/g, "-").toLowerCase()}`
      // );
      router.push(
        productPath(
          stores?.find((s) => s.id === selectedProduct.business_id),
          { ...selectedProduct, id }
        )
      );
    }
  };

  const handleFollowClick = (id: string) => {
    setIsFollowed(
      (prevFollowed) =>
        prevFollowed.includes(id)
          ? prevFollowed.filter((followId) => followId !== id) // Unfollow
          : [...prevFollowed, id] // Follow
    );
  };

  const handleLikeClick = async (id: string) => {
    //("ids clicked", id);
    await addWishlist(id);
  };

  const [search, setSearch] = useState(false);

  return (
    <MainLayout
      headerProps={{
        showBack: !search,
        customText: "Social media vendor spotlights",
        onBackClick: () => router.back(),
        showSearch: !search,
        handleSearchClick: () => setSearch((prev) => !prev),
        showInput: search,
      }}>
      {/* Main content */}
      <div
        ref={scrollContainerRef}
        className="flex flex-col mt-11 lg:mt-0 h-[calc(100vh-80px)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide px-4 lg:px-5 pb-2"
        style={{
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}>
        {groupedData
          ?.slice(0, 5)
          ?.map(
            (store: {
              business: string;
              products: ProductData[];
              id: string;
            }, index: number) => {
              const businessDetails = getBusinessDetails(
                stores,
                store.business
              );
              const isCurrentCard = index === currentBusinessIndex;
              const dynamicBackgroundImage = stableBackgroundImages.get(store.business) || "/images/bg.avif";

              return (
                <div
                  key={store.business}
                  className="relative p-3 rounded-field shadow-md flex flex-col justify-between snap-start"
                  style={{
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundImage: `url(${dynamicBackgroundImage})`,
                    height: "calc(100vh - 140px)",
                    minHeight: "calc(100vh - 140px)",
                    marginBottom: "16px",
                  }}>
                  {/* Black Overlay */}
                  <div className="flex-1 bg-black/60 absolute top-0 bottom-0 right-0 left-0 rounded-field" />

                  <div className="z-10">
                    {/* Story Progress Bar */}
                    {isCurrentCard && (
                      <div className="w-full rounded-field h-1 bg-ink-40/50 z-[9999] relative">
                        <div
                          className="h-full bg-white z-[9999] transition-all duration-100"
                          style={{ width: `${loadingProgress}%` }}></div>
                      </div>
                    )}

                    {/* Store Name */}
                    <div className="mb-4 z-30">
                      <div className="flex justify-between items-center mb-2 z-20">
                        <div className="flex gap-2 px-2 py-2">
                          <div>
                            <img
                              src={(businessDetails?.logo as string) || "/images/vendor/vendorDefaultbg.png"}
                              alt={businessDetails?.name || "Store Logo"}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          </div>

                          <div>
                            <p className="text-body-sm font-medium text-white capitalize">
                              {businessDetails?.name}
                            </p>
                            <p className="text-white font-normal text-caption capitalize">
                              {businessDetails?.category || "Category"}
                            </p>
                            <div className="font-normal text-caption flex items-center gap-1 text-white capitalize">
                              <FaStar size={10} className="text-white" />
                              {businessDetails?.average_rating || "0.0"}{" "}
                              <span className="inline-block h-1 w-1 rounded-full bg-white/70" />{" "}
                              <FiUsers size={10} className="text-white" />
                              {businessDetails?.followers_count || "0"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 z-30 relative">
                          <button
                            className="bg-black/15 backdrop-blur-md text-white py-2 px-3 rounded-full text-body-sm font-medium items-center flex gap-1 z-30 relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowClick(store.business);
                            }}>
                            {isFollowed.includes(store.business)
                              ? "Unfollow"
                              : "Follow"}
                          </button>
                          <IoIosArrowForward size={20} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="z-10">
                    {/* Scrollable Product List */}
                    {showProducts && (
                      <div className="grid grid-cols-2 gap-2 w-full items-end z-30 relative">
                        {store?.products.slice(0, 4).map((item, index) => (
                          <div key={index} className="z-30 relative">
                            <WishlistComponent
                              item={item}
                              handleProductClick={() => {
                                handleProductClick(
                                  index,
                                  businessDetails?.name + "",
                                  item.product_id + ""
                                );
                              }}
                              index={index}
                              liked={likedStates[index]}
                              handleLikeClick={() => {
                                handleLikeClick(item.id + "");
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-center items-center pt-2 z-30 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (businessDetails) {
                            setStore(businessDetails);
                          }
                          router.push(storePath(businessDetails));
                        }}
                        type="button"
                        className="flex flex-row gap-1 justify-center items-center text-center py-3 rounded-full text-body-sm font-normal px-3 bg-brand text-brandInk z-30 relative">
                        Visit store front{" "}
                        <IoIosArrowForward size={20} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          )}
      </div>
    </MainLayout>
  );
};

export default Page;
