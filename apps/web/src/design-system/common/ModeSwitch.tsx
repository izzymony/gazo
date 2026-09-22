"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import useAuthStore from "@/store/authStore";
import { cn } from "@/lib/utils";
import { ShoppingBag, Store } from "@vibaar/ui/icons";
import Button from "@vibaar/ui/common/Button";

/**
 * The buyer ↔ seller mode switch.
 *
 * The icon used to be a PNG-ish `/icons/Switch-to-*.svg` loaded through
 * `next/image`, with `fill="white"` baked into every path. An `<img>` cannot
 * inherit colour, so `text-brandInk` on the pill reached the label and not the
 * glyph: a white icon beside a black label on the same yellow, and white on
 * brand is 1.28:1 — the rule IconButton's `onBrand` variant and Badge already
 * state. HugeIcons draw in `currentColor`, so the pill's own colour carries it.
 *
 * `variant="rail"` is the desktop sidebar's full-width copy. That was a second,
 * separately-maintained button in DesktopNav with the same classes and the same
 * white glyph.
 */
const ModeSwitch = ({ variant = "floating" }: { variant?: "floating" | "rail" }) => {
  const router = useRouter();
  const pathName = usePathname();
  const { user } = useAuthStore();
  // Switching modes means loading a whole other side of the app, and until it
  // paints there is nothing on screen to say the tap registered — so the button
  // went quiet and people tapped it again. It owns the wait: the spinner starts
  // on the click and only stops when the new route's pathname arrives.
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setIsSwitching(false);
  }, [pathName]);

  // Determine current mode based on route
  const isSellerMode = pathName.startsWith('/dashboard');
  const canSell = user?.business?.id;
  const isProfilePage = pathName === '/profile';

  // Show button on profile page (regardless of business status) or if user can sell
  if (!isProfilePage && !canSell && variant === "floating") return null;

  const handleSwitch = () => {
    if (isSellerMode) {
      // From seller → buyer: go to the marketplace.
      setIsSwitching(true);
      router.push('/shop');
    } else if (canSell) {
      // From buyer → seller: go to dashboard (user has business)
      setIsSwitching(true);
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

  // Where you are going, not where you are.
  const Icon = isSellerMode ? ShoppingBag : Store;

  const button = (
    <Button
      variant="filled"
      fullWidth={variant === "rail"}
      loading={isSwitching}
      loadingText={buttonText}
      onClick={handleSwitch}
      className={cn("gap-2", variant === "rail" ? "mt-0" : "w-max")}>
      <Icon size={20} aria-hidden="true" />
      <span>{buttonText}</span>
    </Button>
  );

  if (variant === "rail") return button;

  return (
    // bottom-20 is the shared clearance above the 60px bottom nav — the same one
    // FloatingAction uses. This was `bottom-[72px]`, one of four different
    // hand-picked guesses at the same gap.
    <div className="fixed bottom-20 left-0 right-0 z-dropdown flex w-full justify-center lg:hidden">
      {button}
    </div>
  );
};

export default ModeSwitch;
