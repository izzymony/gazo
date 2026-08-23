"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";
import Image from "next/image";
import ComingSoonPill from "./ComingSoonPill";

const ModeSwitch = () => {
  const router = useRouter();
  const pathName = usePathname();
  const { user } = useAuthStore();

  // Determine current mode based on route
  const isSellerMode = pathName.startsWith('/dashboard');
  const canSell = user?.business?.id;
  const isProfilePage = pathName === '/profile';

  // Show button on profile page (regardless of business status) or if user can sell
  if (!isProfilePage && !canSell) return null;

  const handleSwitch = () => {
    // TEMPORARY: Marketplace (buying mode) disabled
    if (isSellerMode) {
      // DISABLED: From seller → buyer: go to vendors page
      // router.push('/shop');
      return; // Do nothing - button is disabled
    } else if (canSell) {
      // From buyer → seller: go to dashboard (user has business)
      router.push('/dashboard');
    } else {
      // User wants to switch to selling but has no business - trigger modal
      // This will be handled by the profile page component
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('openSellerModal'));
      }
    }
  };

  const buttonText = isSellerMode
    ? "Switch to buying"
    : canSell
      ? "Switch to selling"
      : "Start selling";

  const iconSrc = isSellerMode
    ? "/icons/Switch-to-buying.svg"
    : "/icons/Switch-to-selling.svg";

  // Disable "Switch to buying" button (marketplace coming soon)
  const isDisabled = isSellerMode;

  return (
    <div className="fixed bottom-[72px] left-0 right-0 w-full flex justify-center z-sticky lg:hidden">
      <button
        onClick={handleSwitch}
        disabled={isDisabled}
        className={`flex items-center gap-2 rounded-full shadow-pop px-4 py-3 w-max bg-brand text-white relative ${
          isDisabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <Image
          src={iconSrc}
          alt={buttonText}
          width={20}
          height={20}
          className="w-5 h-5"
        />
        <span className="text-body font-medium">{buttonText}</span>
        {isDisabled && (
          <ComingSoonPill className="ml-1" />
        )}
      </button>
    </div>
  );
};

export default ModeSwitch;