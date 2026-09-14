import React from "react";
import BuyerShell from "@/features/buyer-shell/BuyerShell";

/**
 * Buyer route-group frame.
 *
 * Everything structural lives in `BuyerShell` — the height-bounded positioned
 * container `PageShell` needs, and the single mount point for buyer navigation.
 * Pages render their content and nothing else; none of them decides whether
 * navigation exists.
 *
 * Modal slots are declared per SEGMENT (see cart/layout.tsx and
 * profile/shipping-address/layout.tsx), not here. A slot at this group root is
 * an ancestor of all 26 buyer routes, which is what made it attractive for
 * checkout's four entry points — and Next's router crashed on it.
 */
export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return <BuyerShell>{children}</BuyerShell>;
}
