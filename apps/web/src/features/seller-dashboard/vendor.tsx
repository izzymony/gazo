/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
import React, { useEffect, useState } from "react";
import Button from "@vibaar/ui/common/Button";
import img1 from "../../../public/PRODUCT IMAGE (2).png";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { useRouter } from "next/navigation";
import EmptyState from "@vibaar/ui/common/EmptyState";
import { BusinessData, ProductData } from "@/lib/types";
import { formatCurrency, getMobileCompatibleImageUrl } from "@/lib/utils";
import { FaStar, FiUsers, IoIosArrowForward, HeartFilled, MdFavoriteBorder } from "@vibaar/ui/icons";

type BusinessDetails = (
  data: BusinessData[],
  businessId: string
) => BusinessData | null;

const Vendor = () => {
  const router = useRouter();
  const [isFollowed, setIsFollowed] = useState<string[]>([]);
  const [likedItems] = useState<number[]>([]);
  const { products } = useProductStore();
  const [likedStates, setLikedStates] = useState<boolean[]>(
    Array(products.length).fill(false)
  );

  const { fetchStores, stores, store } = useBusinessStore();

  useEffect(() => {
    fetchStores();
  }, [fetchStores, store?.id]);

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

  const handleFollowClick = (id: string) => {
    setIsFollowed(
      (prevFollowed) =>
        prevFollowed.includes(id)
          ? prevFollowed.filter((followId) => followId !== id) // Unfollow
          : [...prevFollowed, id] // Follow
    );
  };

  const handleLikeClick = (index: number | string) => {
    if (typeof index === "number") {
      const newLikedStates = [...likedStates];
      newLikedStates[index] = !newLikedStates[index];
      setLikedStates(newLikedStates);
    }
  };

  return (
    <div>
      <p className="text-body-sm font-medium mb-3">Vendors you follow</p>
      {groupedData.length === 0 ||
        groupedData.every((group) => group.products.length === 0) ? (
        <EmptyState
          title="No followed vendors yet."
          subtitle="Start following a vendor to see their products and storefront here."
          image="/images/cart/empty_cart_state.svg">
          <Button
            variant="bordered"
            type="button"
            onClick={() => router.push("/shop")}
            className="text-body-sm !px-5 py-1 !w-[max-content]">
            Explore vendors
          </Button>
        </EmptyState>
      ) : (
        <div className="gap-4">
          {groupedData
            ?.slice(0, 5)
            ?.map(
              (store: {
                business: string;
                products: ProductData[];
                id: string;
              }) => {
                const businessDetails = getBusinessDetails(
                  stores,
                  store.business
                );
                return (
                  <div
                    key={store.business}
                    className="mb-4 p-2 rounded-field shadow-md !bg-cover !bg-no-repeat border border-ink-10"
                    style={{
                      backgroundSize: "cover",
                      backgroundRepeat: "no-repeat !important",
                      backgroundImage: `url(/images/vendor/VendorBg.png)`,
                    }}
                    onClick={() => {
                      router.push(`/shop/${businessDetails?.name}`);
                    }}>
                    {/* Store Name */}
                    <div className="mb-4">
                      <div className="flex justify-between mb-2">
                        <div className="flex gap-2 px-2 py-2">
                          <div>
                            <img
                              src={"/images/vendor/vendorDefaultbg.png"}
                              alt="Inspected Logo"
                              width={50}
                              height={50}
                            />
                          </div>

                          <div>
                            <p className="text-body-sm font-medium text-white capitalize">
                              {businessDetails?.name}
                            </p>
                            <p className="text-white/60 font-normal text-caption capitalize">
                              fashion
                            </p>
                            <div className="font-normal text-caption flex items-center gap-1 text-white/60 capitalize">
                              <FaStar size={8} className="text-white" />
                              5.4{" "}
                              <span className="inline-block h-1 w-1 rounded-full bg-white/70" />
                              100k{" "}
                              <FiUsers size={10} className="text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="text-white py-2 px-3 rounded-full text-body-sm font-normal items-center flex gap-1"
                            onClick={() => handleFollowClick(store.business)}>
                            {isFollowed.includes(store.business)
                              ? "Unfollow"
                              : "Following"}
                          </button>
                          <IoIosArrowForward size={16} className="text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Product List */}
                    <div className="flex  gap-3 overflow-x-auto scrollbar-hide py-2 ">
                      {store?.products?.map((item, index) => (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (businessDetails) {
                              router.push(
                                `/shop/${businessDetails.name}/products/${item.id}`
                              );
                            }
                          }}
                          key={item.id}
                          className="p-3 rounded-card flex items-center cursor-pointer bg-white/20 backdrop-blur-md max-w-[180px] min-w-[180px] w-full"
                          style={{
                            backdropFilter: "blur(12px)",
                          }}>
                          <img
                            src={item?.image ? getMobileCompatibleImageUrl(item.image[0]) : img1.src} // Replace with item.image if dynamic
                            className="w-[60px] h-[80px] object-cover rounded-card"
                          />
                          <div className="flex  flex-col ml-2 w-full">
                            <p className="text-caption font-normal line-clamp-2 text-white">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-1 text-micro mb-4">
                              <FaStar size={8} className="text-warning" />

                              <span className="text-white">4.5</span>
                            </div>
                            <div className="flex items-center justify-between ">
                              <div className="flex flex-col">
                                <p className="text-micro font-normal line-through text-white/40">
                                  {item.old_price}
                                </p>
                                <p className="text-body-sm font-medium text-white">
                                  {formatCurrency(
                                    item?.price ? +item.price : 0
                                  )}
                                </p>
                              </div>
                              <div
                                onClick={() =>
                                  item.id && handleLikeClick(item.id)
                                }>
                                {likedItems.includes(index) ? (
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15">
                                    <HeartFilled size={14} className="text-brand" />
                                  </span>
                                ) : (
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15">
                                    <MdFavoriteBorder size={14} className="text-white" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
        </div>
      )}
    </div>
  );
};

export default Vendor;
