"use client";

import Link from "next/link";
import Image from "next/image";
import Tooltip from "@vibaar/ui/common/Tooltip";
import { iconButtonVariants } from "@vibaar/ui/common/IconButton";
import { Store, User } from "@vibaar/ui/icons";
import { focusRing } from "@vibaar/ui/styles";
import { cn } from "@vibaar/utils";
import { useAuthSnapshot } from "@/hooks/useAuthSnapshot";
import { useSellerDestination } from "@/hooks/useAuthSnapshot";

/** The account slot — secondary, so it stays quiet. */
const control = cn(
  "flex size-11 items-center justify-center rounded-field transition-colors",
  "text-foreground-muted hover:bg-surface-muted hover:text-foreground-secondary",
  focusRing
);

/*
 * The seller switch keeps the filled brand treatment it has everywhere else —
 * the floating pill on mobile and the full-width button on the seller rail both
 * use Button's `filled`, and this is the same fill at icon size. It is the one
 * thing in the rail that is an offer rather than a destination, and it should
 * not read as another grey glyph.
 *
 * Borrowed from IconButton rather than restated: it has to be a LINK, since it
 * changes the URL and must be middle-clickable and openable in a new tab, so it
 * cannot be that component — but it should be indistinguishable from it.
 */
const sellerSwitch = iconButtonVariants({ variant: "filled", size: "lg" });

/**
 * The rail's bottom group: what you are, and the way across to selling.
 *
 * TWO STACKED ROWS, not a cluster. They answer unrelated questions — one is
 * your account, the other is a mode switch — and side by side in a 5rem column
 * they would read as a pair of peers.
 *
 * The account appears exactly ONCE here and nowhere in the destinations above.
 * A Profile tab in the centre plus an avatar down here would be two controls for
 * one place; `/profile` already IS the signed-out account screen, so the same
 * slot simply says "Sign in" when there is nobody to show.
 *
 * `useSellerDestination` resolves signed-out to /signup, signed-in-without-a-
 * store to store creation, and an owner to /dashboard, through a snapshot whose
 * server value is "signed out" — so it cannot cause a hydration mismatch on a
 * prerendered route.
 *
 * `ModeSwitch` is deliberately not reused: its floating variant is `lg:hidden`
 * so it has no desktop presence at all, its rail variant is a full-width
 * labelled button, it reads the auth store directly, and its no-store branch
 * fires an `openSellerModal` event whose only listener lives on /profile.
 */
export default function BuyerRailAccount() {
  const { user, isAuthenticated } = useAuthSnapshot();
  const seller = useSellerDestination();
  const signedIn = Boolean(isAuthenticated && user);
  const avatar = user?.profile_image;

  const sellerLabel = seller.hasStore ? "Switch to selling" : "Start selling";

  return (
    <div className="flex flex-col items-center gap-1">
      <Tooltip label={sellerLabel}>
        <Link href={seller.href} aria-label={sellerLabel} className={sellerSwitch}>
          <Store size={22} aria-hidden="true" />
        </Link>
      </Tooltip>

      <Tooltip label={signedIn ? "Profile" : "Sign in"}>
        <Link
          href={signedIn ? "/profile" : "/signin"}
          aria-label={signedIn ? "Profile" : "Sign in"}
          className={control}>
          {signedIn && avatar ? (
            <Image
              src={avatar}
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-full object-cover"
            />
          ) : (
            <User size={22} aria-hidden="true" />
          )}
        </Link>
      </Tooltip>
    </div>
  );
}
