// Pure formatters lifted from web's src/lib/utils.ts (M1 — the @vibaar/ui
// extraction needs formatTrendForNigerianMarket; formatCurrency + parseAmount are
// lifted alongside since they're pure and broadly shared). No app coupling.

export interface TrendData {
  percentage: number | string;
  isPositive: boolean;
  displayText: string;
  color: string;
  showArrow: boolean;
}

export function formatCurrency(
  amount: number | null | undefined,
  locale: string = "en-NG",
  currency: string = "NGN",
): string {
  if (amount == null) {
    return "0";
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Signature preserved for call-site parity (currentValue/isNewStore are accepted
// but not used in the body — matches web's original).
export const formatTrendForNigerianMarket = (
  percentChange: number | string,
  currentValue: number | string,
  isNewStore: boolean = false,
  storeCreatedAt?: string | Date,
): TrendData => {
  const numericChange =
    typeof percentChange === "string" ? parseFloat(percentChange) : percentChange;

  if (storeCreatedAt) {
    const createdDate = new Date(storeCreatedAt);
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreation <= 7) {
      return {
        percentage: 0,
        isPositive: true,
        displayText: "New store",
        color: "#22C55E",
        showArrow: false,
      };
    }
  }

  if (numericChange === 0 || isNaN(numericChange)) {
    return { percentage: 0, isPositive: true, displayText: "0%", color: "#6B7280", showArrow: true };
  }
  if (numericChange > 0) {
    return {
      percentage: numericChange,
      isPositive: true,
      displayText: `${numericChange.toFixed(0)}%`,
      color: "#22C55E",
      showArrow: true,
    };
  }
  return {
    percentage: Math.abs(numericChange),
    isPositive: false,
    displayText: `${Math.abs(numericChange).toFixed(0)}%`,
    color: "#EF4444",
    showArrow: true,
  };
};
