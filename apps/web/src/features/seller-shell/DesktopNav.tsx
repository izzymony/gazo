"use client";
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Home,
  Package,
  Store,
  Analytics,
  Settings,
  HelpSquare,
  IconProps,
} from "@vibaar/ui/icons";
import Spinner from "@vibaar/ui/common/Spinner";
import { supportWhatsAppUrl } from "@/lib/support";

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
    <nav className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-surface border-r border-outline flex-col py-6 px-4 z-sticky">
      {/* Logo/Brand */}
      <div className="mb-8 px-3">
        <Image
          src="/brand/logo-black.svg"
          alt="Vibaar"
          width={140}
          height={40}
          className="mb-2"
          priority
        />
        <p className="text-body-sm text-foreground-muted">Dashboard</p>
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
                  ? "bg-brand/10 text-brandDeep font-semibold"
                  : "text-foreground-secondary hover:bg-surface-muted font-medium"
              }`}>
              {isLoading ? (
                <>
                  <Spinner />
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
      <div className="pt-6 border-t border-outline space-y-2">
        {/* Switch to Buying */}
        <button
          type="button"
          onClick={() => router.push("/shop")}
          className="relative flex w-full items-center gap-2 rounded-full bg-brand px-4 py-3 text-brandInk shadow-pop transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 focus-visible:ring-offset-1">
          <Image
            src="/icons/Switch-to-buying.svg"
            alt="Switch to buying"
            width={20}
            height={20}
            className="w-5 h-5"
          />
          <span className="text-body font-medium">Switch to buying</span>
        </button>

        {/* Help & Support Button */}
        <a
          href={supportWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-field hover:bg-surface-muted text-foreground-secondary transition-colors">
          <HelpSquare size={20} />
          <span className="text-body font-medium">Help &amp; Support</span>
        </a>
      </div>
    </nav>
  );
}
