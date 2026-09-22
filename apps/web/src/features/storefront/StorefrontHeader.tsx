"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import VerifiedCheck from "@vibaar/ui/common/VerifiedCheck";
import BackButton from "@vibaar/ui/common/header/BackButton";
import { bannerBackground, vendorThemeFrom } from "@/lib/bannerUtils";
import BannerPattern from "@/features/storefront/BannerPattern";

export type StorefrontHeaderVariant = "hero" | "compact";

/** Only the fields a header actually reads. */
interface HeaderStore {
  name?: string;
  logo?: unknown;
  category?: string;
  is_verified?: boolean;
  address?: { province?: string; address_line?: string } | null;
  business_setting?: {
    personalised_settings?: {
      background_color?: string;
      background_image?: string;
      background_state?: string;
      background_pattern?: string;
    } | null;
  } | null;
}

interface StorefrontHeaderProps {
  variant: StorefrontHeaderVariant;
  /** The vendor being shown. ALWAYS the viewed vendor — never the signed-in user. */
  store: HeaderStore | null | undefined;
  /** Defaults to router.back(). */
  onBack?: () => void;
  /** Trailing control(s): the overflow menu, a Follow button, Edit/Share. */
  trailing?: ReactNode;
  /** Extra actions under the hero identity block (owner's Edit/Share row). */
  actions?: ReactNode;
  /**
   * compact only: draw the banner at its full height instead of just behind the
   * bar, and animate between the two.
   *
   * The storefront leads with a 191px banner that collapses to a 68px bar as you
   * scroll. The product page is the same vendor and should read the same way —
   * but its CONTENT does not change between the two states, only the height of
   * the backdrop. So rather than a second variant, `expanded` grows the banner
   * below the bar; whatever follows overlaps that overhang, and both animate
   * together so the collapse has nothing to jump.
   */
  expanded?: boolean;
  /** Unique per mounted instance — SVG mask ids are document-global. */
  backMaskId: string;
  className?: string;
}

/**
 * StorefrontHeader — the vendor banner, in its two sizes.
 *
 * This replaces three components that did one job three ways: `VendorHeader`
 * (the storefront hero), `SmallHeader` (the storefront's collapsed bar) and
 * `ProductHeader` (the product page's bar). They shared the banner, the scrim,
 * the pattern layer, the back control and the identity block — and disagreed
 * about everything else:
 *
 *   - Theme. VendorHeader used `vendorThemeFrom(store)` and its comment warned
 *     "do NOT fall back to the global theme — that is the logged-in seller's".
 *     The other two did exactly that (`vendorTheme || theme`), and Product.tsx
 *     hand-built the object twice more with per-field fallbacks. So a signed-in
 *     seller browsing another vendor saw their own banner colour.
 *   - Seed. `bannerBackground`'s second argument seeds the deterministic
 *     fallback colour. The three passed `store?.name`, `title || store?.name`
 *     and `title` — so one vendor with no colour set could render three
 *     different banners across three consecutive screens.
 *   - Controls. VendorHeader hand-rolled its back arrow as a raw 36px inline
 *     SVG while the others used the shared BackButton; ProductHeader's trailing
 *     "menu" was a bare SVG with no button, no handler and no label.
 *
 * There is now one theme rule (the vendor's own settings, no global fallback),
 * one seed (the vendor's name) and one back control. What legitimately differs
 * between call sites — who may Edit, who may Follow — arrives as `trailing` /
 * `actions` rather than as a mode flag inside the component.
 */
const asImageSrc = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

/**
 * The banner's overhang when expanded. Paired with `HEADER_OVERHANG_PULL` on
 * whatever sits beneath, so the two move as one and the collapse is a single
 * continuous motion rather than a reflow.
 */
export const HEADER_OVERHANG = "pb-32";
export const HEADER_OVERHANG_PULL = "-mt-32";
/** Duration of the expand/collapse, in ms. Matches `duration-300` below. */
export const HEADER_COLLAPSE_MS = 300;

export default function StorefrontHeader({
  variant,
  store,
  onBack,
  trailing,
  actions,
  expanded = false,
  backMaskId,
  className,
}: StorefrontHeaderProps) {
  const router = useRouter();
  const theme = vendorThemeFrom(store);
  const handleBack = onBack ?? (() => router.back());
  const isHero = variant === "hero";

  // A photo banner keeps a lighter scrim than a flat colour: the photo already
  // carries contrast, a flat brand colour does not.
  const scrim = theme.backgroundType === "color" ? "bg-overlay/50" : "bg-overlay/30";

  return (
    <div
      className={cn(
        // 24, matching the cards that sit on and below it. All three of these —
        // the root, the pattern and the scrim — carry the same value: change one
        // and the pattern paints square corners outside the rounded root.
        "relative flex w-full flex-col rounded-b-panel transition-spacing duration-300 ease-out",
        isHero ? "pt-2" : "shadow-card",
        !isHero && expanded && HEADER_OVERHANG,
        className
      )}
      style={bannerBackground(theme, store?.name)}>
      <BannerPattern theme={theme} className="rounded-b-panel" />
      <div className={cn("absolute inset-0 z-10 rounded-b-panel", scrim)} />

      <div className="relative z-20 w-full max-w-full lg:mx-auto lg:max-w-5xl">
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 md:px-6 lg:px-8",
            isHero ? "py-2" : "py-3"
          )}>
          <BackButton onClick={handleBack} maskId={backMaskId} />

          {/* The compact bar names the vendor inline; the hero gives it a block
              of its own below, so this slot stays empty there. */}
          {!isHero && (
            <div className="mx-auto flex min-w-0 items-center gap-2 text-white">
              <StoreLogo src={asImageSrc(store?.logo)} storeName={store?.name || "Store"} size={24} />
              <p className="flex min-w-0 items-center gap-1 truncate text-body font-medium capitalize">
                <span className="truncate">{store?.name}</span>
                <VerifiedCheck verified={store?.is_verified} size={14} />
              </p>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-2">{trailing}</div>
        </div>

        {isHero && (
          <div className="flex flex-col items-center justify-center px-4 pb-6">
            <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-center">
              <StoreLogo
                src={asImageSrc(store?.logo)}
                storeName={store?.name || "Store"}
                size={56}
                className="border-2 border-white/10"
              />
              <div className="flex flex-col gap-0.5">
                <p className="flex items-center justify-center gap-1 text-body-lg font-medium text-white">
                  {store?.name}
                  <VerifiedCheck verified={store?.is_verified} size={15} />
                </p>
                {/* Joined from the parts that exist. It used to be
                    `{category} in {province}`, which rendered a dangling
                    "Home & Living Store in" whenever a vendor had no province. */}
                {[store?.category, store?.address?.province].filter(Boolean).length > 0 && (
                  <p className="text-body-sm font-normal text-white/90">
                    {[store?.category, store?.address?.province].filter(Boolean).join(" · ")}
                  </p>
                )}
                {store?.address?.address_line && (
                  <p className="line-clamp-1 text-body-sm font-normal text-white/80">
                    {store.address.address_line}
                  </p>
                )}
              </div>
            </div>
            {actions && <div className="mt-3 flex flex-row items-center gap-3">{actions}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
