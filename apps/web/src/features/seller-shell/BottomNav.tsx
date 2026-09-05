"use client";
import React, { memo, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Package,
  Store,
  Analytics,
  Settings,
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
  // Exact path matching with priority order
  if (pathName === "/dashboard/analytics") return "Analytics";
  if (pathName.startsWith("/dashboard/settings") || pathName.startsWith("/dashboard/storefront")) return "Settings";
  if (pathName === "/dashboard/orders" || pathName.startsWith("/dashboard/orders/")) return "Orders";
  if (pathName.startsWith("/dashboard/catalog")) return "Catalog";
  if (pathName === "/dashboard") return "Home";

  return null;
};

const BottomNav = memo(() => {
  const pathName = usePathname();
  const router = useRouter();
  const activeNavItem = getActiveNavItem(pathName);
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  // Clear the tab spinner as soon as the destination route actually lands.
  // (Previously coupled to the global businessLoading store flag, which stayed
  // true and left the active tab stuck on a false "Loading…" state.)
  useEffect(() => {
    setLoadingRoute(null);
  }, [pathName]);

  const handleNavClick = (route: string) => {
    if (pathName === route || loadingRoute) return;

    setLoadingRoute(route);
    router.push(route);
  };

  // Loading reflects real navigation only — the tapped tab, until its route lands.
  const isNavItemLoading = (route: string) => loadingRoute === route;

  return (
    <div className="absolute bottom-0 h-[60px] right-0 left-0 w-full flex justify-between items-center border-t-[0.5px] bg-surface border-t-outline lg:hidden">
      {navLinks.map(({ title, Icon, route }) => {
        const isActive = activeNavItem === title;
        const isLoading = isNavItemLoading(route);

        return (
          <button
            key={title}
            onClick={() => handleNavClick(route)}
            disabled={isLoading || (loadingRoute !== null && !isActive)}
            className={`flex-1 h-full flex flex-col justify-center items-center gap-1 text-caption font-medium transition-colors disabled:opacity-50 ${
              isActive ? "text-brandDeep" : "text-foreground-muted"
            }`}>
            {isLoading ? (
              <svg
                className="animate-spin h-[22px] w-[22px]"
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
            ) : (
              <Icon size={22} />
            )}
            <p>{title}</p>
          </button>
        );
      })}
    </div>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
