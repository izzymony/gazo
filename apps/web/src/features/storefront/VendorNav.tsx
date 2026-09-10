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
  /** Where the tab goes. Kept separate from the routes that make it active. */
  href: string;
  activeOn: string[];
};

const navLinks: NavLink[] = [
  { Icon: Home, label: "Shop", href: "/shop", activeOn: ["/shop"] },
  {
    Icon: ShoppingCart,
    label: "Cart and orders",
    href: "/cart",
    activeOn: ["/cart", "/orders"],
  },
  { Icon: User, label: "Profile", href: "/profile", activeOn: ["/profile"] },
];

const routeIsActive = (pathName: string, route: string) =>
  pathName === route || pathName.startsWith(`${route}/`);

/**
 * The buyer's floating tab bar.
 *
 * Each destination is a `NavItem`, which is what finally gives these an
 * accessible name: they were icon-only links with no label, so a screen reader
 * announced "link, link, link" on every buyer screen, and the active one was
 * distinguishable only by colour.
 *
 * The cart marker was a bare coloured dot — sighted users could see that items
 * were waiting, everyone else got nothing. It is a counted, announced badge now.
 *
 * The bar itself is a tab surface rather than a 150x44 pill with three glyphs
 * crammed into it: an outlined, elevated container over a blurred backdrop,
 * clear of the home indicator via pb-safe, with each tab an equal flex column.
 * The geometry is deliberately restrained — 56px tall on a 24px glyph, so the
 * 44px touch floor is exactly met (56 less the 1.5 padding either side) without
 * the bar growing into the content it floats over.
 *
 * `href` is separate from `activeOn` because the two are genuinely different
 * questions, and conflating them was a bug: the cart tab took its href from the
 * first of its routes, so tapping the cart opened /orders. It now goes to /cart
 * and stays current on both.
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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-sticky px-4 pb-safe lg:hidden">
      <nav
        aria-label="Marketplace"
        className="pointer-events-auto mx-auto mb-4 flex h-14 w-full max-w-xs items-center gap-1 rounded-pill border border-outline-subtle bg-surface/95 p-1.5 shadow-pop backdrop-blur-md">
        {navLinks.map(({ Icon, label, href, activeOn }) => {
          const isActive = activeOn.some((route) => routeIsActive(pathName, route));
          const isCartRoute = href === "/cart";

          return (
            <NavItem
              key={href}
              href={href}
              icon={<Icon size={24} />}
              label={label}
              variant="floating"
              active={isActive}
              badge={isCartRoute ? totalCartItems : undefined}
              badgeLabel={isCartRoute ? "items in cart" : undefined}
              className="h-full flex-1"
            />
          );
        })}
      </nav>
    </div>
  );
});

VendorNav.displayName = "VendorNav";

export default VendorNav;
