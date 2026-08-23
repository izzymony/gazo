"use client";
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import ComingSoonPill from "@vibaar/ui/common/ComingSoonPill";
import {
  Home,
  Package,
  Store,
  Analytics,
  Settings,
  HelpSquare,
  IconProps,
} from "@vibaar/ui/icons";

type NavLink = {
  Icon: React.ComponentType<IconProps>;
  route: string;
  title: string;
};

const navLinks: NavLink[] = [
  { Icon: Home, route: "/dashboard", title: "Home" },
  { Icon: Package, route: "/dashboard/orders", title: "Orders" },
  { Icon: Store, route: "/dashboard/catalog", title: "Catalog" },
  { Icon: Analytics, route: "/dashboard/analytics", title: "Analytics" },
  { Icon: Settings, route: "/dashboard/settings", title: "Settings" },
];

// Helper function for exact path matching
const getActiveNavItem = (pathName: string) => {
  if (pathName === "/dashboard/analytics") return "Analytics";
  if (pathName.startsWith("/dashboard/settings") || pathName.startsWith("/dashboard/storefront")) return "Settings";
  if (pathName === "/dashboard/orders" || pathName.startsWith("/dashboard/orders/")) return "Orders";
  if (pathName.startsWith("/dashboard/catalog")) return "Catalog";
  if (pathName === "/dashboard") return "Home";
  return null;
};

export default function DesktopNav() {
  const pathName = usePathname();
  const router = useRouter();
  const activeNavItem = getActiveNavItem(pathName);
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  // Clear the spinner once the destination route lands (no global-flag coupling).
  useEffect(() => {
    setLoadingRoute(null);
  }, [pathName]);

  const handleNavClick = (route: string) => {
    if (pathName === route || loadingRoute) return;

    setLoadingRoute(route);
    router.push(route);
  };

  const isNavItemLoading = (route: string) => loadingRoute === route;

  return (
    <nav className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-ink-10 flex-col py-6 px-4 z-sticky">
      {/* Logo/Brand */}
      <div className="mb-8 px-3">
        <Image
          src="/images/instashop_logo_black.svg"
          alt="Vibaar"
          width={140}
          height={42}
          className="mb-2"
          priority
        />
        <p className="text-body-sm text-ink-50">Dashboard</p>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-1">
        {navLinks.map(({ title, Icon, route }) => {
          const isActive = activeNavItem === title;
          const isLoading = isNavItemLoading(route);

          return (
            <button
              key={title}
              onClick={() => handleNavClick(route)}
              disabled={isLoading || (loadingRoute !== null && !isActive)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-field text-body transition-all duration-200 disabled:opacity-50 ${
                isActive
                  ? "bg-brand/10 text-brand font-semibold"
                  : "text-ink-60 hover:bg-ink-5 font-medium"
              }`}>
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Icon size={20} />
                  <span>{title}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Section - Switch to Buyer & Help */}
      <div className="pt-6 border-t border-ink-10 space-y-2">
        {/* Switch to Buying Button - TEMPORARY: Disabled (Marketplace coming soon) */}
        <button
          onClick={() => {
            // DISABLED: router.push("/shop");
          }}
          disabled
          className="w-full flex items-center gap-2 px-4 py-3 rounded-full bg-brand text-white transition-colors shadow-pop opacity-50 cursor-not-allowed relative">
          <Image
            src="/icons/Switch-to-buying.svg"
            alt="Switch to buying"
            width={20}
            height={20}
            className="w-5 h-5"
          />
          <span className="text-body font-medium">Switch to buying</span>
          <ComingSoonPill className="ml-auto" />
        </button>

        {/* Help & Support Button */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-field hover:bg-ink-5 text-ink-60 transition-colors">
          <HelpSquare size={20} />
          <span className="text-body font-medium">Help &amp; Support</span>
        </button>
      </div>
    </nav>
  );
}
