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
import { getStoreColor, DEFAULT_PATTERN } from "@/lib/bannerUtils";

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
        isSeller?.pro ? "" : "bg-white"
      }`}
      style={{
        background: isSeller?.pro ? (
          activeTheme.backgroundType === "color"
            ? (activeTheme.backgroundColor || getStoreColor(title || store?.name || "Store"))
            : (activeTheme.backgroundImage ? `url(${activeTheme.backgroundImage})` : getStoreColor(title || store?.name || "Store"))
        ) : "white",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      {isSeller?.pro && activeTheme.backgroundType === "color" && (
        <Image
          src={activeTheme.pattern || DEFAULT_PATTERN}
          alt="Pattern"
          width={0}
          height={0}
          className="absolute inset-0 w-full h-full object-cover z-10"
          style={{
            opacity: 1, // Adjust as needed for visibility
          }}
        />
      )}

      {isSeller?.pro && (
        <div
          className="absolute inset-0 z-20"
          style={{
            background:
              activeTheme.backgroundType === "color" ? "#00000080" : "#0000004D",
          }}></div>
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
              className="text-xs font-medium text-white px-2 py-2 bg-brand rounded-full justify-center items-center flex">
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
              className="bg-brand text-white py-2 px-3 rounded-full text-xs font-bold items-center flex gap-1"
              onClick={onFollowClick}>
              {isFollowed ? "Unfollow" : "Follow"}
              </button>
*/
