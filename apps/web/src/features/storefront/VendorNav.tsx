"use client";
import React, { memo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/features/seller-shell/BottomNav";
import useOrderStore from "@/store/orderStore";
import { Home, ShoppingCart, User, IconProps } from "@/design-system/icons";

interface Props {
  isSeller?: {
    seller?: boolean;
    pro?: boolean;
  };
}

type NavLink = {
  Icon: React.ComponentType<IconProps>;
  route: string | string[];
  dynamic?: boolean;
};

const navLinks: NavLink[] = [
  { Icon: Home, route: "/shop" },
  { Icon: ShoppingCart, route: ["/orders", "/cart"], dynamic: true },
  { Icon: User, route: "/profile" },
];

const VendorNav = memo(({ isSeller }: Props) => {
  const pathName = usePathname();
  const { cart, carts } = useOrderStore();

  // Calculate total cart items from both cart arrays
  const totalCartItems = cart.length + carts.reduce((total, business) => total + business.products.length, 0);

  return isSeller?.seller ? (
    <BottomNav />
  ) : (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-pill h-11 bg-white z-sticky w-full max-w-[150px] flex justify-between items-center px-5 shadow-pop lg:hidden"
    >
      {navLinks.map(({ Icon, route, dynamic }) => {
        const isActive = Array.isArray(route)
          ? route.some((r) => pathName.startsWith(r))
          : (dynamic && pathName.startsWith(route)) || pathName === route;

        const isCartRoute = Array.isArray(route) && route.includes("/cart");

        return (
          <Link
            href={Array.isArray(route) ? route[0] : route}
            prefetch
            key={Array.isArray(route) ? route[0] : route}
            className={`flex items-center flex-col transition-colors ${
              isActive ? "text-brand" : "text-ink-40"
            }`}>
            <div className="relative">
              <Icon size={24} />
              {/* Show red dot only for cart route when there are items */}
              {isCartRoute && totalCartItems > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand border border-white rounded-full" />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
});

VendorNav.displayName = "VendorNav";

export default VendorNav;
