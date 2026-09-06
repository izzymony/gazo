"use client";

import { cn, formatTrendForNigerianMarket } from "@vibaar/utils";
import Image from "next/image";

interface TrendIndicatorProps {
  percentChange: number | string;
  currentValue: number | string;
  isNewStore?: boolean;
  storeCreatedAt?: string | Date;
  className?: string;
}

const TrendIndicator = ({
  percentChange,
  currentValue,
  isNewStore = false,
  storeCreatedAt,
  className = ""
}: TrendIndicatorProps) => {
  const trendData = formatTrendForNigerianMarket(percentChange, currentValue, isNewStore, storeCreatedAt);

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-caption",
        trendData.displayText === "0%"
          ? "text-foreground-muted"
          : trendData.isPositive
            ? "text-success-foreground"
            : "text-error-foreground",
        trendData.displayText === "New store" && "font-normal",
        className
      )}>
      {trendData.displayText}
      {/* Direction was carried by colour plus an arrow that only renders when
          showArrow is set — so without it, up and down read identically. */}
      {trendData.displayText !== "0%" && trendData.displayText !== "New store" && (
        <span className="sr-only">{trendData.isPositive ? "increase" : "decrease"}</span>
      )}
      {trendData.showArrow && (
        <Image
          src={trendData.isPositive ? "/icons/trending_up.svg" : "/icons/trending_down.svg"}
          alt=""
          aria-hidden="true"
          width={15}
          height={16}
          className="inline-block"
        />
      )}
    </span>
  );
};

export default TrendIndicator;
