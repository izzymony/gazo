"use client";

import BottomNav from "@/features/seller-shell/BottomNav";
import DesktopNav from "@/features/seller-shell/DesktopNav";
import React from "react";
import DetailFetcher from "./fectproducts";
import { usePathname } from "next/navigation";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide bottom/side nav for focused Class-B sub-flows (details, create/edit,
  // setup forms) — nav stays only on the navigable Class-A hubs.
  const hideNavigation =
    (pathname?.includes('/orders/') && pathname !== '/dashboard/orders') ||
    (pathname?.includes('/inbox/') && pathname !== '/dashboard/inbox') ||
    Boolean(pathname?.startsWith('/dashboard/wallet')) ||
    Boolean(pathname?.startsWith('/dashboard/payouts')) ||
    Boolean(pathname?.startsWith('/dashboard/transactions')) ||
    Boolean(pathname?.includes('/catalog/product/')) ||
    Boolean(pathname?.includes('/catalog/discount/')) ||
    Boolean(pathname?.startsWith('/dashboard/settings/'));
  
  return (
    <>
      {/* Desktop Sidebar Navigation - hidden on mobile */}
      {!hideNavigation && <DesktopNav />}

      {/* Main Content Area — ONE scroll container.
          This div and its child both carried `overflow-y-scroll` with the child
          at h-full, so the child could never scroll independently: it was exactly
          its parent's height, and a second scrollport there only added a place
          for scroll position to be ambiguous. Pages that bring their own scroller
          (the storefront, the product page) then sat three deep. The child is a
          plain spacing wrapper now; scrolling belongs to this element alone. */}
      <div className="flex flex-col overflow-x-hidden overflow-y-scroll scrollbar-hide w-full h-dvh relative lg:pl-64">
        <div className={`h-full w-full ${hideNavigation ? '' : 'mb-[60px] lg:mb-0'}`}>
          <div className="w-full max-w-full lg:max-w-5xl lg:mx-auto px-0 lg:px-6">
            {children}
          </div>
        </div>
        {/* Mobile Bottom Navigation - hidden on desktop */}
        {!hideNavigation && <BottomNav />}
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DetailFetcher>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </DetailFetcher>
  );
}
