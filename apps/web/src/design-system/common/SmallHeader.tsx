/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import useBusinessStore from "@/store/businessStore";
import VerifiedCheck from "@vibaar/ui/common/VerifiedCheck";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { PiShareFatThin } from "@vibaar/ui/icons";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import BackButton from "@vibaar/ui/common/header/BackButton";
import KebabMenu from "@vibaar/ui/common/header/KebabMenu";
import { bannerBackground } from "@/lib/bannerUtils";
import BannerPattern from "@/features/storefront/BannerPattern";

interface SmallHeaderProps {
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
  vendorStore?: any; // Store data for the vendor being viewed
}

const SmallHeader: React.FC<SmallHeaderProps> = ({
  title,
  isFollowed,
  onFollowClick,
  onShareClick,
  isSeller,
  vendorTheme,
  vendorStore,
}) => {
  const { theme, stor } = useBusinessStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  // Use vendorStore if provided (buyer mode), otherwise use stor (seller mode)
  const store = vendorStore || (isSeller?.seller ? stor : null);
  
  // Use vendor theme if provided, fallback to global theme
  const activeTheme = vendorTheme || theme;

  return (
    <div
      className={`sticky top-0 w-full shadow-md p-2 z-sticky flex flex-col ${
        isSeller?.pro ? "" : "bg-surface"
      }`}
      style={
        isSeller?.pro
          ? bannerBackground(activeTheme, title || store?.name)
          : { background: "white" }
      }
    >
      {isSeller?.pro && <BannerPattern theme={activeTheme} />}

      {/* Scrim, so white text reads over any seller colour or photo. Was a
          raw #00000080 / #0000004D; `overlay` is the token for exactly this. */}
      {isSeller?.pro && (
        <div
          className={`absolute inset-0 z-20 ${
            activeTheme.backgroundType === "color" ? "bg-overlay/50" : "bg-overlay/30"
          }`}
        />
      )}
      <div className="w-full max-w-full lg:max-w-5xl lg:mx-auto z-[20]">
      <div className="flex items-center justify-between px-3 md:px-6 lg:px-8">
        <BackButton onClick={() => router.back()} maskId="mask0_7921_80516" />
        <div className="flex items-center gap-2 mx-auto text-white">
          <StoreLogo
            src={store?.logo}
            storeName={title || store?.name || "Store"}
            size={24}
          />
          <p
            className={`flex items-center gap-1 capitalize text-white font-medium text-sm leading-4`}>
            {title}
            <VerifiedCheck verified={store?.is_verified} size={14} />
          </p>
        </div>
        <div className="flex gap-2">
          {isSeller?.seller ? (
            <KebabMenu isOpen={isOpen} setIsOpen={setIsOpen} store={store} />
          ) : (
            <div
              onClick={onFollowClick}
              className="text-xs font-medium text-brandInk px-2 py-2 bg-brand rounded-full justify-center items-center flex">
              {isFollowed ? "Unfollow" : "Follow"}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default SmallHeader;

/*
 <button
              className="bg-brand text-brandInk py-2 px-3 rounded-full text-xs font-bold items-center flex gap-1"
              onClick={onFollowClick}>
              {isFollowed ? "Unfollow" : "Follow"}
              </button>
*/
