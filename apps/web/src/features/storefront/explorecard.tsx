/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductData } from "@/lib/types";
import { formatCurrency, getMobileCompatibleImageUrl } from "@/lib/utils";
import useAuthStore from "@/store/authStore";
import useBusinessStore from "@/store/businessStore";
import useProductStore, { Products } from "@/store/productStore";
import Image from "next/image";
import { useCallback } from "react";
import StoreLogo from "@vibaar/ui/common/StoreLogo";

export default function ExploreCard({
  cardAction,
  onPrefetch,
  onPrefetchProduct,
  bussinessName,
  id,
  store,
  smallCardAction,
  likedItems,
  handleLikeClick,
  image,
  category,
  vendorTheme,
  businessDetails,
  dynamicBackgroundImage,
}: {
  cardAction: () => void;
  onPrefetch?: () => void;
  onPrefetchProduct?: (item: any) => void;
  bussinessName: string;
  id: string;
  store: Products[] | ProductData[];
  smallCardAction: (e: any, item: any) => void;
  likedItems: any[];
  handleLikeClick: (item: any) => void;
  image: string;
  category: string;
  vendorTheme?: {
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundType?: string;
  };
  businessDetails?: {
    logo?: string;
    followers_count?: number;
    average_rating?: number;
  };
  dynamicBackgroundImage?: string;
}) {
  const { spotlightProduct } = useProductStore();

  const {
    fetchFollowedBusinessess,
    setFollowedBusinessess,
    followedBusinesses,
  } = useBusinessStore();
  const { unfollowBusiness, followBusiness, user } = useAuthStore();
  //(bussinessName, id);

  const fetchFollowedBusiness = useCallback(
    async (val: string) => {
      try {
        const totalPages = 10; // Define the total number of pages
        const requests = Array.from({ length: totalPages }, (_, i) =>
          fetchFollowedBusinessess(i + 1)
        );
        const responses: any = await Promise.all(requests);

        const bank = responses.flat();
        //("followed ", val, bank, user?.id);
        setFollowedBusinessess(!user?.id ? [] : bank);
      } catch (error) {
        console.error("Error fetching bank details:", error);
      }
    },
    [fetchFollowedBusinessess, setFollowedBusinessess, user?.id]
  );
  const follow = useCallback(
    () => followBusiness(id, fetchFollowedBusiness),
    [fetchFollowedBusiness, followBusiness, id]
  );
  const unfollow = useCallback(
    () => unfollowBusiness(id, fetchFollowedBusiness),
    [fetchFollowedBusiness, id, unfollowBusiness]
  );
  const followed = followedBusinesses.find((item) => item?.id === id)
    ? { title: "Unfollow", action: unfollow }
    : { title: "Follow", action: follow };
  // Vendor cards ONLY use dynamic product images (vendor themes are for store pages only)
  const cardBackground = dynamicBackgroundImage
    ? `url(${dynamicBackgroundImage})`
    : "#1e293b"; // Fallback dark color if no product images available

  return (
    <div
      className="mb-2 rounded-[20px] lg:rounded-[24px] h-[212px] md:h-[240px] lg:h-[260px] w-full shadow-md lg:shadow-lg overflow-hidden relative cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-xl"
      style={{
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        background: cardBackground,
      }}
      onClick={cardAction}
      onMouseEnter={onPrefetch}
      onTouchStart={onPrefetch}>
      {/* Overlay for text contrast */}
      <div
        className="absolute inset-0 bg-black/70 rounded-[20px] lg:rounded-[24px]"
      />

      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {/* Store Name */}
        <div className="mb-4 px-2 pt-2">
          <div className="flex justify-between mb-2">
            <div className="flex gap-2 px-2 py-2">
              <div>
                <StoreLogo
                  src={businessDetails?.logo}
                  storeName={bussinessName}
                  size={40}
                  className=""
                />
              </div>

              <div>
                <p className="text-xs font-normal text-white capitalize line-clamp-1">
                  {bussinessName}
                </p>
                <p className="text-[#ffffff91] font-normal text-caption capitalize">
                  {category}
                </p>
                <div className="font-normal text-caption flex items-center gap-1 text-[#ffffff91] capitalize">
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3.62851 0.343199C3.72455 0.148641 3.77257 0.051362 3.83775 0.0202813C3.89447 -0.00676044 3.96036 -0.00676044 4.01708 0.0202813C4.08226 0.051362 4.13028 0.148641 4.22632 0.343199L5.13743 2.18902C5.16579 2.24646 5.17996 2.27518 5.20068 2.29747C5.21902 2.31722 5.24102 2.33321 5.26546 2.34458C5.29306 2.35741 5.32475 2.36204 5.38813 2.37131L7.42616 2.66919C7.64077 2.70056 7.74808 2.71625 7.79774 2.76867C7.84094 2.81427 7.86126 2.87694 7.85304 2.93922C7.84358 3.01081 7.7659 3.08648 7.61052 3.23781L6.13635 4.67366C6.09039 4.71842 6.06741 4.7408 6.05259 4.76743C6.03946 4.791 6.03104 4.81691 6.02779 4.84369C6.02412 4.87395 6.02954 4.90556 6.04039 4.96879L6.38823 6.99686C6.42491 7.21077 6.44326 7.31772 6.40878 7.38119C6.37879 7.43641 6.32547 7.47514 6.26369 7.4866C6.19267 7.49976 6.09663 7.44925 5.90454 7.34824L4.08257 6.39008C4.0258 6.36023 3.99741 6.3453 3.96751 6.33943C3.94103 6.33424 3.9138 6.33424 3.88732 6.33943C3.85742 6.3453 3.82903 6.36023 3.77227 6.39008L1.95029 7.34824C1.75821 7.44925 1.66216 7.49976 1.59115 7.4866C1.52936 7.47514 1.47604 7.43641 1.44605 7.38119C1.41158 7.31772 1.42992 7.21077 1.46661 6.99686L1.81444 4.96879C1.82529 4.90556 1.83071 4.87395 1.82704 4.84369C1.82379 4.81691 1.81537 4.791 1.80224 4.76743C1.78742 4.7408 1.76444 4.71842 1.71849 4.67366L0.244309 3.23781C0.0889351 3.08648 0.0112483 3.01081 0.00179481 2.93922C-0.00643026 2.87694 0.0138895 2.81427 0.0570966 2.76867C0.106757 2.71625 0.214064 2.70056 0.428677 2.66919L2.46671 2.37131C2.53009 2.36204 2.56178 2.35741 2.58937 2.34458C2.61381 2.33321 2.63581 2.31722 2.65415 2.29747C2.67487 2.27518 2.68905 2.24646 2.7174 2.18902L3.62851 0.343199Z"
                      fill="white"
                    />
                  </svg>
                  {businessDetails?.average_rating || "0.0"}{" "}
                  <svg
                    width="4"
                    height="4"
                    viewBox="0 0 4 4"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <circle cx="2" cy="2" r="2" fill="white" />
                    <circle
                      cx="2"
                      cy="2"
                      r="2"
                      fill="black"
                      fill-opacity="0.2"
                    />
                  </svg>{" "}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M7.50457 6.5987C8.1112 6.90344 8.63129 7.39248 9.01092 8.00401C9.0861 8.12511 9.12369 8.18566 9.13668 8.26951C9.1631 8.43991 9.04657 8.64939 8.88788 8.71682C8.80979 8.75 8.72194 8.75 8.54624 8.75M6.67124 4.8051C7.28862 4.49829 7.7129 3.86119 7.7129 3.125C7.7129 2.38881 7.28862 1.75171 6.67124 1.4449M5.8379 3.125C5.8379 4.16053 4.99844 5 3.9629 5C2.92737 5 2.0879 4.16053 2.0879 3.125C2.0879 2.08947 2.92737 1.25 3.9629 1.25C4.99844 1.25 5.8379 2.08947 5.8379 3.125ZM1.07092 7.89098C1.73521 6.89356 2.78348 6.25 3.9629 6.25C5.14233 6.25 6.1906 6.89356 6.85489 7.89098C7.00042 8.10948 7.07318 8.21873 7.06481 8.3583C7.05828 8.46697 6.98705 8.6 6.90022 8.66566C6.78871 8.75 6.63533 8.75 6.32859 8.75H1.59722C1.29048 8.75 1.1371 8.75 1.02559 8.66566C0.938757 8.6 0.867524 8.46697 0.861001 8.3583C0.852624 8.21873 0.925388 8.10948 1.07092 7.89098Z"
                      stroke="white"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  {businessDetails?.followers_count || "0"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mr-3">
              <button
                className="text-white rounded-full py-2 px-3 text-xs font-medium items-center flex gap-1 text-center flex-row justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  followed.action();
                }}>
                {followed.title}
              </button>
              <svg
                width="7"
                height="13"
                viewBox="0 0 7 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4.93333 6.50026L0.233333 1.80026C0.0777778 1.6447 0 1.45582 0 1.23359C0 1.01137 0.0777778 0.822483 0.233333 0.666927C0.388889 0.511372 0.577778 0.433594 0.8 0.433594C1.02222 0.433594 1.21111 0.511372 1.36667 0.666927L6.35 5.65026C6.47222 5.77248 6.56111 5.90582 6.61667 6.05026C6.67222 6.19471 6.7 6.34471 6.7 6.50026C6.7 6.65582 6.67222 6.80582 6.61667 6.95026C6.56111 7.09471 6.47222 7.22804 6.35 7.35026L1.36667 12.3336C1.21111 12.4891 1.02222 12.5669 0.8 12.5669C0.577778 12.5669 0.388889 12.4891 0.233333 12.3336C0.0777778 12.178 0 11.9892 0 11.7669C0 11.5447 0.0777778 11.3558 0.233333 11.2003L4.93333 6.50026Z"
                  fill="white"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Scrollable Product List */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pt-2 pb-2 pl-2 -mr-2 pr-4">
          {store.map((item) => {
            //("it=> ", item.id);
            const rates = item.product_rating
              ? item.product_rating.length > 0
              : false;
            const p = item.product_rating || [];
            const spt = spotlightProduct.find((it) => it.product_id === item.id)
              ? true
              : false;
            //(spt);
            return (
              <div
                onClick={(e) => smallCardAction(e, item)}
                onMouseEnter={() => onPrefetchProduct?.(item)}
                onTouchStart={() => onPrefetchProduct?.(item)}
                key={item.id}
                className="p-2 rounded-field lg:rounded-card flex gap-2 items-center cursor-pointer bg-white/10 backdrop-blur-md min-w-[200px] w-[200px] border border-white/20 shadow-sm flex-shrink-0">
                <img
                  alt={item.title || "Product"}
                  src={item.image ? getMobileCompatibleImageUrl(item?.image[0]) : image}
                  className="w-[55px] h-[70px] lg:w-[60px] lg:h-[80px] object-cover rounded-lg lg:rounded-xl border border-white/10 flex-shrink-0"
                />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  <p className="text-caption line-clamp-1 font-normal text-[#FFFFFF]">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1 text-micro mb-2">
                    <svg
                      width="10"
                      height="11"
                      viewBox="0 0 10 11"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg">
                      <mask
                        id="mask0_4527_80379"
                        maskUnits="userSpaceOnUse"
                        x="0"
                        y="0"
                        width="10"
                        height="11">
                        <rect y="0.5" width="10" height="10" fill="#D9D9D9" />
                      </mask>
                      <g mask="url(#mask0_4527_80379)">
                        <path
                          d="M4.62851 1.8432C4.72455 1.64864 4.77257 1.55136 4.83775 1.52028C4.89447 1.49324 4.96036 1.49324 5.01708 1.52028C5.08226 1.55136 5.13028 1.64864 5.22632 1.8432L6.13743 3.68902C6.16579 3.74646 6.17996 3.77518 6.20068 3.79747C6.21902 3.81722 6.24102 3.83321 6.26546 3.84458C6.29306 3.85741 6.32475 3.86204 6.38813 3.87131L8.42616 4.16919C8.64077 4.20056 8.74807 4.21625 8.79773 4.26867C8.84094 4.31427 8.86126 4.37694 8.85304 4.43922C8.84358 4.51081 8.7659 4.58648 8.61052 4.73781L7.13635 6.17366C7.09039 6.21842 7.06741 6.2408 7.05259 6.26743C7.03946 6.291 7.03104 6.31691 7.02779 6.34369C7.02412 6.37395 7.02954 6.40556 7.04039 6.46879L7.38823 8.49687C7.42491 8.71077 7.44326 8.81772 7.40878 8.88119C7.37879 8.93641 7.32547 8.97514 7.26368 8.9866C7.19267 8.99976 7.09662 8.94925 6.90454 8.84824L5.08257 7.89008C5.0258 7.86023 4.99741 7.8453 4.96751 7.83944C4.94103 7.83424 4.9138 7.83424 4.88732 7.83944C4.85742 7.8453 4.82903 7.86023 4.77227 7.89008L2.95029 8.84824C2.75821 8.94925 2.66216 8.99976 2.59115 8.9866C2.52936 8.97514 2.47604 8.93641 2.44605 8.88119C2.41158 8.81772 2.42992 8.71077 2.46661 8.49687L2.81444 6.46879C2.82529 6.40556 2.83071 6.37395 2.82704 6.34369C2.82379 6.31691 2.81537 6.291 2.80224 6.26743C2.78742 6.2408 2.76444 6.21842 2.71849 6.17366L1.24431 4.73781C1.08894 4.58648 1.01125 4.51081 1.00179 4.43922C0.99357 4.37694 1.01389 4.31427 1.0571 4.26867C1.10676 4.21625 1.21406 4.20056 1.42868 4.16919L3.46671 3.87131C3.53009 3.86204 3.56178 3.85741 3.58937 3.84458C3.61381 3.83321 3.63581 3.81722 3.65415 3.79747C3.67487 3.77518 3.68905 3.74646 3.7174 3.68902L4.62851 1.8432Z"
                          fill="#FFCC00"
                        />
                      </g>
                    </svg>

                    <span className="text-[#FFFFFF]">
                      {rates ? p.reduce((a, c) => a + c.rate, 0) / p.length : 0}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mt-1">
                    <div className="flex flex-col">
                      <p className="text-micro font-normal line-through text-[#ffffff91]">
                        {item.old_price}
                      </p>
                      <p className="text-xs font-normal text-[#FFFFFF]">
                        {formatCurrency(item?.price ? +item.price : 0)}
                      </p>
                    </div>
                    {/* like button */}
                    <div onClick={() => item.id && handleLikeClick(item.id)} className="flex-shrink-0">
                      {spt ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg">
                          <rect
                            x="0.40918"
                            y="-0.00390625"
                            width="19.5907"
                            height="19.5907"
                            rx="9.79535"
                            fill="black"
                            fill-opacity="0.15"
                          />
                          <mask
                            id="mask0_7965_57995"
                            maskUnits="userSpaceOnUse"
                            x="4"
                            y="4"
                            width="12"
                            height="12">
                            <rect
                              x="4.7627"
                              y="4.34766"
                              width="10.8837"
                              height="10.8837"
                              fill="#D9D9D9"
                            />
                          </mask>
                          <g mask="url(#mask0_7965_57995)">
                            <path
                              d="M12.0696 5.16406C13.6669 5.16406 14.7402 6.68438 14.7402 8.10267C14.7402 10.9749 10.2859 13.3269 10.2053 13.3269C10.1247 13.3269 5.67041 10.9749 5.67041 8.10267C5.67041 6.68438 6.74367 5.16406 8.34095 5.16406C9.25801 5.16406 9.85762 5.62832 10.2053 6.03646C10.553 5.62832 11.1526 5.16406 12.0696 5.16406Z"
                              fill="white"
                            />
                          </g>
                        </svg>
                      ) : (
                        <svg
                          width="24"
                          height="27"
                          viewBox="0 0 24 27"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg">
                          <rect
                            y="0.578125"
                            width="24"
                            height="25.92"
                            rx="12"
                            fill="black"
                            fill-opacity="0.15"
                          />
                          <mask
                            id="mask0_4527_80385"
                            maskUnits="userSpaceOnUse"
                            x="4"
                            y="6"
                            width="16"
                            height="15">
                            <rect
                              x="4.7998"
                              y="6.33984"
                              width="14.4"
                              height="14.4"
                              fill="#D9D9D9"
                            />
                          </mask>
                          <g mask="url(#mask0_4527_80385)">
                            <path
                              d="M14.4667 8.14062C16.58 8.14062 18 10.1521 18 12.0286C18 15.8289 12.1067 18.9406 12 18.9406C11.8933 18.9406 6 15.8289 6 12.0286C6 10.1521 7.42 8.14062 9.53333 8.14062C10.7467 8.14062 11.54 8.75488 12 9.29488C12.46 8.75488 13.2533 8.14062 14.4667 8.14062Z"
                              stroke="white"
                              stroke-width="0.72"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </g>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
