"use client";
import React, { memo } from "react";
import { usePathname } from "next/navigation";
import NavGlyph from "@vibaar/ui/common/NavGlyph";
import NavItem from "@vibaar/ui/common/NavItem";
import { activeRoutesFor, navForSurface, routeIsActive } from "./buyerNav";
import { useCartCount } from "./selectors";

/**
 * The buyer's floating tab bar.
 *
 * Unchanged in every respect a shopper can see: the same three destinations,
 * the same links, the same geometry. What moved is where it is mounted — the
 * shell owns that now — and where its destinations come from, which is the
 * shared registry rather than a list private to this file.
 *
 * Each destination is a `NavItem`, which is what gives these an accessible
 * name: they were icon-only links with no label, so a screen reader announced
 * "link, link, link" on every buyer screen, and the active one was
 * distinguishable only by colour.
 *
 * The cart marker was a bare coloured dot — sighted users could see that items
 * were waiting, everyone else got nothing. It is a counted, announced badge now.
 *
 * The bar is a tab surface rather than a 150x44 pill with three glyphs crammed
 * into it: an outlined, elevated container over a blurred backdrop, clear of the
 * home indicator via pb-safe. The geometry is deliberately restrained — 56px on
 * a 24px glyph, so the 44px touch floor is exactly met without the bar growing
 * into the content it floats over.
 */
const BuyerBottomNav = memo(() => {
  const pathName = usePathname() ?? "";
  const totalCartItems = useCartCount();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-sticky px-4 pb-safe lg:hidden">
      <nav
        aria-label="Marketplace"
        className="pointer-events-auto mx-auto mb-4 flex h-14 w-full max-w-xs items-center gap-1 rounded-pill border border-outline-subtle bg-surface/95 p-1.5 shadow-pop backdrop-blur-md">
        {navForSurface("mobile").map((link) => {
          const isActive = activeRoutesFor(link, "mobile").some((route) =>
            routeIsActive(pathName, route)
          );
          const isCart = link.id === "cart";

          return (
            <NavItem
              key={link.id}
              href={link.href}
              icon={
                <NavGlyph active={isActive} icon={link.Icon} size={24} solid={link.Solid} />
              }
              label={link.label}
              variant="floating"
              active={isActive}
              badge={isCart ? totalCartItems : undefined}
              badgeLabel={isCart ? "items in cart" : undefined}
              className="h-full flex-1"
            />
          );
        })}
      </nav>
    </div>
  );
});

BuyerBottomNav.displayName = "BuyerBottomNav";

export default BuyerBottomNav;
