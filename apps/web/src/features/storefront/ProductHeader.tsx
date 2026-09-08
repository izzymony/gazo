/* eslint-disable @next/next/no-img-element */
"use client";
import React from "react";
import Image from "next/image";
import useBusinessStore from "@/store/businessStore";
import { useRouter } from "next/navigation";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import BackButton from "@vibaar/ui/common/header/BackButton";
import { bannerBackground } from "@/lib/bannerUtils";
import BannerPattern from "@/features/storefront/BannerPattern";

interface SmallHeaderProps {
  logoSrc?: string;
  title: string | undefined;
  isFollowed: boolean;
  onFollowClick: () => void;
  onShareClick?: () => void;
  showFollow?: boolean;
  showShare?: boolean;
  isSeller?: {
    pro?: boolean;
    seller?: boolean;
  };
  vendorTheme?: {
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundType?: string;
    pattern?: string;
  };
}

const ProductHeader = ({ title, isSeller, logoSrc, vendorTheme }: SmallHeaderProps) => {
  const { theme } = useBusinessStore();
  const router = useRouter();
  
  // Use vendor theme if provided, fallback to global theme
  const activeTheme = vendorTheme || theme;

  return (
    isSeller?.pro && (
      <div
        className={`absolute top-0 left-0 right-0 w-full max-w-full lg:max-w-5xl lg:mx-auto shadow-md p-2 pt-4 flex flex-col ${
          isSeller?.pro ? "h-[20vh] rounded-b-[20px]" : "bg-surface"
        }`}
        style={bannerBackground(activeTheme, title)}
      >
        <BannerPattern theme={activeTheme} className="w-[24px] h-[24px] rounded-b-[20px]" />

        {/* Scrim, so white text reads over any seller colour or photo. */}
        <div
          className={`absolute inset-0 z-20 rounded-b-[20px] ${
            activeTheme.backgroundType === "color" ? "bg-overlay/50" : "bg-overlay/30"
          }`}
        />
        <div className="w-full max-w-full lg:max-w-5xl lg:mx-auto z-[20]">
        <div className="flex items-center justify-between px-3 md:px-6 lg:px-8 z-[20]">
          <BackButton onClick={() => router.back()} maskId="mask0_7921_18564" />
          <div className="flex flex-1 items-center justify-center gap-2 mx-auto text-white">
            <StoreLogo
              src={logoSrc}
              storeName={title || "Store"}
              size={24}
              className=""
            />
            <p
              className={`capitalize font-medium text-body-lg ${
                !isSeller?.pro && "text-black"
              }`}>
              {title}
            </p>
          </div>
          <div className="">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <mask
                id="mask0_7921_18577"
                maskUnits="userSpaceOnUse"
                x="8"
                y="8"
                width="20"
                height="20">
                <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_7921_18577)">
                <path
                  d="M17.9956 24C17.5819 24 17.2292 23.8527 16.9375 23.5581C16.6458 23.2635 16.5 22.9094 16.5 22.4956C16.5 22.0819 16.6473 21.7292 16.9419 21.4375C17.2365 21.1458 17.5906 21 18.0044 21C18.4181 21 18.7708 21.1473 19.0625 21.4419C19.3542 21.7365 19.5 22.0906 19.5 22.5044C19.5 22.9181 19.3527 23.2708 19.0581 23.5625C18.7635 23.8542 18.4094 24 17.9956 24ZM17.9956 19.5C17.5819 19.5 17.2292 19.3527 16.9375 19.0581C16.6458 18.7635 16.5 18.4094 16.5 17.9956C16.5 17.5819 16.6473 17.2292 16.9419 16.9375C17.2365 16.6458 17.5906 16.5 18.0044 16.5C18.4181 16.5 18.7708 16.6473 19.0625 16.9419C19.3542 17.2365 19.5 17.5906 19.5 18.0044C19.5 18.4181 19.3527 18.7708 19.0581 19.0625C18.7635 19.3542 18.4094 19.5 17.9956 19.5ZM17.9956 15C17.5819 15 17.2292 14.8527 16.9375 14.5581C16.6458 14.2635 16.5 13.9094 16.5 13.4956C16.5 13.0819 16.6473 12.7292 16.9419 12.4375C17.2365 12.1458 17.5906 12 18.0044 12C18.4181 12 18.7708 12.1473 19.0625 12.4419C19.3542 12.7365 19.5 13.0906 19.5 13.5044C19.5 13.9181 19.3527 14.2708 19.0581 14.5625C18.7635 14.8542 18.4094 15 17.9956 15Z"
                  fill="white"
                />
              </g>
            </svg>
          </div>
        </div>
        </div>
      </div>
    )
  );
};

export default ProductHeader;
