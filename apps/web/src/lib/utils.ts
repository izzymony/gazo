/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from "axios";
import {
  ErrorResponse,
  OrderData,
  ProductData,
  StoreData,
  Variation,
} from "./types";
import { toast } from "sonner";
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge doesn't know our custom fontSize tokens (tailwind.config
// fontSize: display/h1/h2/body-lg/body/body-sm/caption/micro). Without this it
// misclassifies e.g. `text-micro` as a text-color and DROPS it when merged next
// to a real text-<color> class — silently falling back to the inherited size.
// Register the scale as font-sizes so size + color coexist.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "h1",
            "h2",
            "body-lg",
            "body",
            "body-sm",
            "caption",
            "micro",
          ],
        },
      ],
    },
  },
});

/**
 * Merge Tailwind class names (W3.3). `clsx` resolves conditionals/arrays;
 * `tailwind-merge` dedupes conflicting utilities so the last one wins
 * (e.g. cn("px-2", cond && "px-4") → "px-4"). Base helper for W3.4+ primitives.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const calculateDiscountPercentage = (
  oldPrice: number | null | undefined,
  newPrice: null | number
) => {
  if (!oldPrice || oldPrice === 0 || newPrice === 0 || !newPrice) return 0;
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100); // Calculate percentage
};

export const getCombinations = (variations: Variation[]): Variation[][] => {
  if (!variations.length) return [];

  const combinations = variations.reduce<Variation[][]>(
    (acc: Variation[][], variation: Variation) => {
      const result: Variation[][] = [];
      acc.forEach((item: Variation[]) => {
        variation?.values?.forEach((value: string | Variation) => {
          // Convert string value to Variation object if necessary
          const variationValue =
            typeof value === "string" ? { values: [value] } : value;

          result.push([...item, variationValue]);
        });
      });
      return result;
    },
    [[]]
  );

  return combinations;
};

export function hasErrorResponse(error: Record<string, any>): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    "error" in error.response.data &&
    typeof error.response.data.error === "string"
  );
}

export function formatDate(date: Date | null): string {
  if (!date) return "";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];

  const dayName = days[date?.getDay()];
  const day = String(date?.getDate()).padStart(2, "0");
  const month = months[date?.getMonth()];
  const year = date?.getFullYear();

  return `${dayName}, ${day}/${month}/${year}`;
}

export const getGreeting = () => {
  const currentHour = new Date().getHours();

  if (currentHour >= 5 && currentHour < 12) {
    return "Good morning 🌞";
  } else if (currentHour >= 12 && currentHour < 18) {
    return "Good afternoon ☀️";
  } else {
    return "Good evening 🌙";
  }
};

// Helper function for handling Axios errors
export const handleAxiosError = (error: unknown): void => {
  let errorMessage: string;

  if (error instanceof AxiosError) {
    const err = error as AxiosError<ErrorResponse>; // Use the defined error response type
    errorMessage = err.response?.data?.error || "Network error";
  } else if (error instanceof Error) {
    // Handle regular Error objects
    errorMessage = error.message || "An error occurred";
  } else if (typeof error === 'string') {
    // Handle string errors
    errorMessage = error;
  } else {
    // Handle any other error types
    errorMessage = "An unexpected error occurred";
  }

  // Special handling for guest token errors
  if (errorMessage === "No refresh token available") {
    // Show guest-friendly message instead of technical error
    toast("Browsing as guest - Sign in for a treat! 😉");
    return;
  }

  toast.error(errorMessage);
};
// Format the timer as MM:SS
export const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (time % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export function formatCurrency(
  amount: number | null | undefined,
  locale: string = "en-NG",
  currency: string = "NGN"
): string {
  if (amount == null) {
    return "0"; // or any other default value you prefer
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a money amount that may arrive as a number or a formatted string with a
 * currency prefix/symbol — e.g. "N1500", "₦1,500.00", "1500". Strips everything
 * except digits and the decimal point, so it's agnostic to which currency mark
 * the backend uses (shipping prices come through as ASCII "N", while some code
 * assumed the "₦" glyph — that mismatch dropped shipping from the review total).
 * Returns 0 for null/blank/unparseable input.
 */
export function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function getBusinessDetails(data: StoreData, businessId: string) {
  if (!Array.isArray(data) || !businessId) {
    return null;
  }

  const business = data.find((item) => item.id === businessId);
  return business || null;
}
export function getOrderDetails(data: OrderData, orderid: string) {
  if (!Array.isArray(data) || !orderid) {
    return null;
  }

  const order = data.find((item) => item.id === orderid);
  return order || null;
}
export function getProductDetails(data: ProductData[], productId: string) {
  if (!Array.isArray(data) || !productId) {
    return null;
  }

  const business = data.find((item) => item.id === productId);
  return business || null;
}

export const filterOrderByBusinessId = (
  orders: OrderData,
  businessId: string
) => {
  if (!Array.isArray(orders) || !businessId) {
    return null;
  }
  return orders?.filter((order) => order?.business_id === businessId);
};

// Function to filter orders by user ID
export const filterOrderByUserId = (orders: OrderData[], userId: string) => {
  return orders?.filter((order: OrderData) => order?.user_id === userId);
};

export function getCartSummary(cart: any[]) {
  let totalPrice = 0;
  let totalProductCount = 0;

  cart.forEach((business) => {
    business.products.forEach(
      (product: { price: number; quantity: number }) => {
        totalPrice += product.price * product.quantity;
        totalProductCount += product.quantity;
      }
    );
  });

  //(totalPrice);

  return { totalPrice, totalProductCount };
}

export const formatTimeAgo = (timestamp: string | number | Date): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return diffInSeconds === 1 ? "1 sec ago" : `${diffInSeconds} secs ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? "1 min ago" : `${diffInMinutes} mins ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? "1 month ago" : `${diffInMonths} months ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return diffInYears === 1 ? "1 year ago" : `${diffInYears} years ago`;
};

interface TrendData {
  percentage: number | string;
  isPositive: boolean;
  displayText: string;
  color: string;
  showArrow: boolean;
}

// Format currency for Nigerian market with proper comma separation
export const formatNigerianCurrency = (amount: number | string): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount.toString().replace(/[₦,]/g, '')) : amount;
  
  if (isNaN(numericAmount) || numericAmount === 0) {
    return '0';
  }
  
  // Format with Nigerian number formatting (comma separators, no decimals for whole numbers)
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericAmount);
};

export const formatTrendForNigerianMarket = (
  percentChange: number | string,
  currentValue: number | string,
  isNewStore: boolean = false,
  storeCreatedAt?: string | Date
): TrendData => {
  const numericChange = typeof percentChange === 'string' ? parseFloat(percentChange) : percentChange;
  const numericValue = typeof currentValue === 'string' ? parseFloat(currentValue.toString().replace(/[₦,]/g, '')) : currentValue;

  // Check if store is actually new (created within last 7 days)
  // Only show "New store" if we have a valid creation date
  let isActuallyNewStore = false;
  if (storeCreatedAt) {
    const createdDate = new Date(storeCreatedAt);
    const daysSinceCreation = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    isActuallyNewStore = daysSinceCreation <= 7;
    
    // Only show "New store" if actually created within 7 days
    if (isActuallyNewStore) {
      return {
        percentage: 0,
        isPositive: true,
        displayText: "New store",
        color: "#22C55E", // Green color
        showArrow: false
      };
    }
  }
  // Don't show "New store" without a valid creation date

  // For zero or no change - still show an icon for consistency
  if (numericChange === 0 || isNaN(numericChange)) {
    return {
      percentage: 0,
      isPositive: true,
      displayText: "0%",
      color: "#6B7280", // Gray color
      showArrow: true  // Show arrow even for 0% for visual consistency
    };
  }

  // For positive changes, show green with upward arrow
  if (numericChange > 0) {
    return {
      percentage: numericChange,
      isPositive: true,
      displayText: `${numericChange.toFixed(0)}%`,
      color: "#22C55E", // Green color
      showArrow: true
    };
  }

  // For negative changes, show red with downward arrow
  return {
    percentage: Math.abs(numericChange),
    isPositive: false,
    displayText: `${Math.abs(numericChange).toFixed(0)}%`,
    color: "#EF4444", // Red color for downtrend
    showArrow: true
  };
};

// Utility function to transform image URLs for mobile compatibility
export const getMobileCompatibleImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  
  // For development: Keep localhost URLs as-is when accessing from browser
  // Only replace for actual mobile device testing
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If we're already on localhost, don't replace
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return imageUrl;
    }
    
    // For mobile access, replace localhost with the current host
    if (imageUrl.includes('localhost:8088')) {
      // Use the current hostname with backend port
      return imageUrl.replace('localhost:8088', `${hostname}:8088`);
    }
  }
  
  return imageUrl;
};
