import React from "react";
import { formatNigerianCurrency, cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "@vibaar/ui/icons";

interface StatsCardProps {
  data: {
    label: string;
    count: number;
    percentage: string;
  }[];
}

const StatsCard: React.FC<StatsCardProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {data.map((item, index) => {
        const isNegative = item.percentage.trim().startsWith("-");
        return (
          <div
            key={index}
            className="border border-ink-10 p-2 rounded-card">
            <p className="font-medium text-body-sm mb-1">{item.label}</p>
            <div className="flex gap-1 items-center">
              <p className="font-medium text-h2">
                {formatNigerianCurrency(item.count)}
              </p>
              {item.count !== 0 && (
                <div className="flex items-center gap-0.5">
                  <p
                    className={cn(
                      "text-body-sm",
                      isNegative ? "text-red" : "text-green"
                    )}>
                    {item.percentage}
                  </p>
                  {isNegative ? (
                    <ArrowDownRight size={14} className="text-red" />
                  ) : (
                    <ArrowUpRight size={14} className="text-green" />
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCard;
