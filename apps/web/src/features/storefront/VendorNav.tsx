"use client";
import React, { memo } from "react";
import { usePathname } from "next/navigation";
import NavItem from "@vibaar/ui/common/NavItem";
import BottomNav from "@/features/seller-shell/BottomNav";
import useOrderStore from "@/store/orderStore";
import { Home, ShoppingCart, User, IconProps } from "@vibaar/ui/icons";

interface Props {
  isSeller?: {
    seller?: boolean;
    pro?: boolean;
  };
}

type NavLink = {
  Icon: React.ComponentType<IconProps>;
  label: string;
  /** One route, or several that all count as this destination. */
  route: string | string[];
  dynamic?: boolean;
};

const navLinks: NavLink[] = [
  { Icon: Home, label: "Shop", route: "/shop" },
  { Icon: ShoppingCart, label: "Cart and orders", route: ["/orders", "/cart"], dynamic: true },
  { Icon: User, label: "Profile", route: "/profile" },
];

/**
 * The buyer's floating bottom bar.
 *
 * Each destination is a `NavItem`, which is what finally gives these an
 * accessible name: they were icon-only links with no label, so a screen reader
 * announced "link, link, link" on every buyer screen, and the active one was
 * distinguishable only by colour.
 *
 * The cart marker was a bare coloured dot — sighted users could see that items
 * were waiting, everyone else got nothing. It is a counted, announced badge now.
 */
const VendorNav = memo(({ isSeller }: Props) => {
  const pathName = usePathname();
  const { cart, carts } = useOrderStore();

  // Calculate total cart items from both cart arrays
  const totalCartItems =
    cart.length + carts.reduce((total, business) => total + business.products.length, 0);

  return isSeller?.seller ? (
    <BottomNav />
  ) : (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-pill h-11 bg-surface z-sticky w-full max-w-[150px] flex justify-between items-center px-5 shadow-pop lg:hidden">
      {navLinks.map(({ Icon, label, route, dynamic }) => {
        const isActive = Array.isArray(route)
          ? route.some((r) => pathName.startsWith(r))
          : (dynamic && pathName.startsWith(route)) || pathName === route;
        const isCartRoute = Array.isArray(route) && route.includes("/cart");
        const href = Array.isArray(route) ? route[0] : route;

        return (
          <NavItem
            key={href}
            href={href}
            icon={<Icon size={24} />}
            label={label}
            active={isActive}
            badge={isCartRoute ? totalCartItems : undefined}
            badgeLabel={isCartRoute ? "items in cart" : undefined}
          />
        );
      })}
    </div>
  );
});

VendorNav.displayName = "VendorNav";

export default VendorNav;
