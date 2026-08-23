import React from "react";

/**
 * Buyer route-group frame.
 *
 * PageShell owns its own header/scroll/footer, but it needs a height-bounded,
 * positioned parent for that to work: `main`'s `overflow-y-auto` only engages
 * when `h-full` resolves against a fixed height, and the absolute mobile header
 * positions against the nearest positioned ancestor. The seller side gets this
 * from the dashboard layout; buyer pages had nothing, so the whole document
 * scrolled and sticky headers/tabs + fixed floating nav all broke.
 *
 * This is the buyer parallel of that frame: one `h-dvh` positioned container.
 */
export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh w-full overflow-hidden">{children}</div>
  );
}
