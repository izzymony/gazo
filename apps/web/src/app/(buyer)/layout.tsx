import React from "react";
import BuyerShell from "@/features/buyer-shell/BuyerShell";

/**
 * Buyer route-group frame.
 *
 * Everything structural lives in `BuyerShell` — the height-bounded positioned
 * container `PageShell` needs, and the single mount point for buyer navigation.
 * Pages render their content and nothing else; none of them decides whether
 * navigation exists.
 */
export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return <BuyerShell>{children}</BuyerShell>;
}
