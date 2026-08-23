"use client";

import { formatTrendForNigerianMarket } from "@/lib/utils";
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
      className={`text-caption flex items-center gap-1 ${
        trendData.displayText === "New store" ? "font-normal" : ""
      } ${className}`}
      style={{ color: trendData.color }}
    >
      {trendData.displayText}
      {trendData.showArrow && (
        <Image
          src={trendData.isPositive ? "/icons/trending_up.svg" : "/icons/trending_down.svg"}
          alt={trendData.isPositive ? "trending up" : "trending down"}
          width={15}
          height={16}
          className="inline-block"
        />
      )}
    </span>
  );
};

export default TrendIndicator;