import type { CSSProperties } from "react";

/**
 * Banner customization utilities.
 * Provides consistent color generation and default patterns for store banners.
 */

/**
 * Professional color palette for store banners (hex values).
 * Matches the gradient colors from StoreLogo component.
 */
const colorPalette = [
  "#3b82f6", // blue-500
  "#22c55e", // green-500
  "#a855f7", // purple-500
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
];

/**
 * Generate a consistent color based on store name.
 * Uses the same hash algorithm as StoreLogo for consistency.
 * @param storeName - The name of the store
 * @returns Hex color string (e.g., "#3b82f6")
 */
export const getStoreColor = (storeName: string): string => {
  if (!storeName) return colorPalette[0];

  let hash = 0;
  for (let i = 0; i < storeName.length; i++) {
    const char = storeName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const colorIndex = Math.abs(hash) % colorPalette.length;
  return colorPalette[colorIndex];
};

/**
 * Default pattern for color mode banners.
 * Always applied when background_state is "color".
 */
export const DEFAULT_PATTERN = "/pattern1.svg";

/**
 * A storefront's banner theme, as the seller configured it.
 *
 * `backgroundType` is "color" (a flat colour plus a pattern overlay) or
 * anything else, which means a photo.
 */
export interface VendorTheme {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundType?: string;
  pattern?: string;
}

/** Shape of the settings blob the API returns on a business. */
type StoreWithSettings = {
  business_setting?: {
    personalised_settings?: {
      background_color?: string;
      background_image?: string;
      background_state?: string;
      background_pattern?: string;
    } | null;
  } | null;
};

/**
 * Read a store's banner theme out of its settings blob.
 *
 * The same four-field mapping — with the same `|| "color"` default — was
 * written out by hand at every call site that needed it, each one restating
 * the `business_setting?.personalised_settings?.background_*` path.
 */
export const vendorThemeFrom = (store: StoreWithSettings | null | undefined): VendorTheme => {
  const settings = store?.business_setting?.personalised_settings;
  return {
    backgroundColor: settings?.background_color,
    backgroundImage: settings?.background_image,
    backgroundType: settings?.background_state || "color",
    pattern: settings?.background_pattern,
  };
};

/**
 * The banner's CSS background, from its theme.
 *
 * A colour theme uses the seller's colour; a photo theme uses their image.
 * Either falls back to a colour derived from the store name, so a banner is
 * never blank while settings are loading or when a seller has set none.
 *
 * This expression was duplicated verbatim across the storefront header, the
 * product header and the vendor hero — three copies that had to agree for the
 * same store to look like itself on three consecutive screens.
 */
export const bannerBackground = (
  theme: VendorTheme,
  storeName: string | undefined
): CSSProperties => {
  const fallback = getStoreColor(storeName || "Store");
  return {
    background:
      theme.backgroundType === "color"
        ? theme.backgroundColor || fallback
        : theme.backgroundImage
          ? `url(${theme.backgroundImage})`
          : fallback,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
};
