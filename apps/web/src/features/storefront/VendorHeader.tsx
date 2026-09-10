/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import useBusinessStore from "@/store/businessStore";
import Link from "next/link";
import useAuthStore from "@/store/authStore";
import KebabMenu from "@vibaar/ui/common/header/KebabMenu";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import VerifiedCheck from "@vibaar/ui/common/VerifiedCheck";
import ShareModal from "@vibaar/ui/common/ShareModal";
import { getPublicStoreUrl } from "@/lib/shareUrls";
import { bannerBackground, vendorThemeFrom } from "@/lib/bannerUtils";
import BannerPattern from "@/features/storefront/BannerPattern";

interface HeaderProp {
  label?: string;
  pro?: boolean;
  isSeller?: {
    seller?: boolean;
    pro?: boolean;
  };
}

function VendorHeader({ isSeller }: HeaderProp) {
  const router = useRouter();
  const {
    stor,
    store: stores,
    theme,
    fetchFollowedBusinessess,
    setFollowedBusinessess,
    followedBusinesses,
  } = useBusinessStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const store = isSeller?.seller ? stores : stor;
  const id = store?.id ? store.id : "";

  // Use ONLY vendor's actual theme data - DO NOT fall back to global theme
  // Global theme is for the logged-in seller's store, not for viewing other vendors
  const vendorTheme = vendorThemeFrom(store);
  //(store);
  const { unfollowBusiness, followBusiness } = useAuthStore();
  //(id);
  const fetchFollowedBusiness = useCallback(
    async (val: string) => {
      try {
        const totalPages = 10; // Define the total number of pages
        const requests = Array.from({ length: totalPages }, (_, i) =>
          fetchFollowedBusinessess(i + 1)
        );
        const responses: any = await Promise.all(requests);

        const bank = responses.flat(); // Merge all responses into one array

        //("followed ", val, bank);
        setFollowedBusinessess(bank);
      } catch (error) {
        console.error("Error fetching bank details:", error);
      }
    },
    [fetchFollowedBusinessess, setFollowedBusinessess]
  );
  const follow = useCallback(
    () => followBusiness(id, fetchFollowedBusiness),
    [fetchFollowedBusiness, followBusiness, id]
  );
  const unfollow = useCallback(
    () => unfollowBusiness(id, fetchFollowedBusiness),
    [fetchFollowedBusiness, id, unfollowBusiness]
  );
  const followed = followedBusinesses.find((item) => item.id === id)
    ? { title: "Unfollow", action: unfollow }
    : { title: "Follow", action: follow };

  // Share store URL and text
  const storeUrl = getPublicStoreUrl({ tag: store?.tag });
  const shareText = `Check out ${store?.name || "my store"} on Vibaar!`;

  // Share store handler
  const handleShareStore = useCallback(() => {
    // Only use Web Share API on mobile devices (desktop share sheets aren't useful)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (navigator.share && isMobile) {
      navigator.share({
        title: store?.name || "My Store",
        text: shareText,
        url: storeUrl,
      }).catch(() => {
        // User cancelled share - silently ignore
      });
    } else {
      // Desktop: open share modal
      setIsShareModalOpen(true);
    }
  }, [store?.name, shareText, storeUrl]);

  return (
    <>
      {/* {isSeller?.pro ? ( */}
      <div
        className="relative pt-2 flex flex-col rounded-b-[20px] w-full"
        style={bannerBackground(vendorTheme, store?.name)}>
        <BannerPattern theme={vendorTheme} className="rounded-b-[20px]" />

        {/* Gradient Overlay - darker at bottom for text contrast */}
        <div
          className="absolute inset-0 z-20 rounded-b-[20px]"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)",
          }}></div>

        <div className="flex items-center justify-between px-3 md:px-6 lg:px-8 z-30">
          <button type="button" className="text-left" aria-label="Go back"
            onClick={() =>
              isSeller?.seller
                ? router.push("/dashboard/catalog")
                : router.back()
            }>
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <rect
                width="36"
                height="36"
                rx="18"
                fill="black"
                fillOpacity="0.05"
              />
              <mask
                id="mask0_7914_50392"
                maskUnits="userSpaceOnUse"
                x="8"
                y="8"
                width="20"
                height="20">
                <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_7914_50392)">
                <path
                  d="M23.832 18.0013H12.1654M12.1654 18.0013L17.9987 12.168M12.1654 18.0013L17.9987 23.8346"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          </button>
          {/* <TbDotsVertical /> */}
          <div className="flex space-x-6">
            <KebabMenu isOpen={isOpen} setIsOpen={setIsOpen} store={store} />
          </div>
        </div>

        {/* Pro Layout Content */}
        <div className="flex flex-col items-center justify-center pb-6 z-30 ">
          <div className="flex flex-col items-center max-w-[350px] mx-auto text-center gap-2">
            <StoreLogo
              src={store?.logo as string | undefined}
              storeName={store?.name || "Store"}
              size={56}
              className="border-[1.63px] border-[#FFFFFF0D]"
            />
            <div className="flex flex-col gap-[2px]">
              <p className="flex items-center gap-1 text-base font-medium text-white">
                {store?.name}
                <VerifiedCheck verified={store?.is_verified} size={15} />
              </p>
              <p className="text-body-sm font-normal text-white">
                {store?.category} in {store?.address?.province}
              </p>
              <p className="text-body-sm line-clamp-1 font-normal text-white">
                {store?.address?.address_line}
              </p>
            </div>
          </div>

          {isSeller?.seller && (
            <div className="flex flex-row gap-5 mt-3">
              <Link
                href={`/dashboard/storefront/details`}
                prefetch
                className="bg-brand text-brandInk py-1 px-2 rounded-full text-sm font-medium ml-auto flex items-center gap-1">
                Edit Store
              </Link>

              <button
                onClick={handleShareStore}
                className="bg-brand text-brandInk py-1 px-2 rounded-full text-sm font-medium ml-auto flex items-center gap-1"
              >
                Share Store
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal for Desktop */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Store"
        shareUrl={storeUrl}
        shareText={shareText}
      />
    </>
  );
}

export default VendorHeader;

/*
 (
            <button
              onClick={followed.action}
              className="bg-brand text-brandInk py-1 px-2 rounded-full text-sm font-medium ml-auto flex items-center gap-1 mx-auto mt-2 mb-2">
              {followed.title}
            </button>
          )
*/
