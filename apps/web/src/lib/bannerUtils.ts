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
