import Image from "next/image";
import { cn } from "@/lib/utils";
import { DEFAULT_PATTERN, type VendorTheme } from "@/lib/bannerUtils";

/**
 * The decorative pattern layer over a colour-themed storefront banner.
 *
 * Renders nothing for a photo theme — a pattern over a seller's own photograph
 * would fight it. Three headers carried a byte-identical copy of this block,
 * each restating the DEFAULT_PATTERN fallback and the `width={0} height={0}`
 * incantation that lets a next/image fill its container.
 *
 * Purely decorative, so `alt` is empty and it is hidden from screen readers;
 * the copy said "Pattern", which is noise in a screen reader.
 */
export default function BannerPattern({
  theme,
  className,
}: {
  theme: VendorTheme;
  /** Layer-specific classes — the rounded base a given banner needs. */
  className?: string;
}) {
  if (theme.backgroundType !== "color") return null;
  return (
    <Image
      src={theme.pattern || DEFAULT_PATTERN}
      alt=""
      aria-hidden="true"
      width={0}
      height={0}
      className={cn("absolute inset-0 w-full h-full object-cover z-10", className)}
    />
  );
}
