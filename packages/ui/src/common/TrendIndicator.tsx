"use client";

import { cn, formatTrendForNigerianMarket } from "@vibaar/utils";
import Image from "next/image";
import Badge from "./Badge";

interface TrendIndicatorProps {
  percentChange: number | string;
  currentValue: number | string;
  isNewStore?: boolean;
  storeCreatedAt?: string | Date;
  className?: string;
}

/**
 * Trend movement = the shared `Badge` preset for a period-on-period change.
 *
 * `plain` variant — a trend sits inline beside the figure it qualifies, so a
 * chip container would fight the metric for attention. It owns the direction →
 * tone decision and the Nigerian-market formatting; Badge owns the rest.
 */
const TrendIndicator = ({
  percentChange,
  currentValue,
  isNewStore = false,
  storeCreatedAt,
  className = ""
}: TrendIndicatorProps) => {
  const trend = formatTrendForNigerianMarket(percentChange, currentValue, isNewStore, storeCreatedAt);
  const isFlat = trend.displayText === "0%" || trend.displayText === "New store";

  return (
    <Badge
      tone={isFlat ? "neutral" : trend.isPositive ? "success" : "error"}
      variant="plain"
      // Direction was carried by colour plus an arrow that only renders when
      // showArrow is set — so without it, up and down read identically.
      srLabel={isFlat ? undefined : trend.isPositive ? "increase" : "decrease"}
      className={cn(trend.displayText === "New store" && "font-normal", className)}>
      {trend.displayText}
      {trend.showArrow && (
        <Image
          src={trend.isPositive ? "/icons/trending_up.svg" : "/icons/trending_down.svg"}
          alt=""
          aria-hidden="true"
          width={15}
          height={16}
          className="inline-block"
        />
      )}
    </Badge>
  );
};

export default TrendIndicator;
