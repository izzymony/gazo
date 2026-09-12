"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavGlyph from "@vibaar/ui/common/NavGlyph";
import NavItem from "@vibaar/ui/common/NavItem";
import BrandLogo from "@vibaar/ui/common/BrandLogo";
import Tooltip from "@vibaar/ui/common/Tooltip";
import { focusRing } from "@vibaar/ui/styles";
import { activeRoutesFor, navForSurface, routeIsActive } from "./buyerNav";
import { useCartCount } from "./selectors";
import BuyerRailAccount from "./BuyerRailAccount";

/**
 * The buyer's desktop rail.
 *
 * AN OVERLAY, NOT A COLUMN. It has no background, border or divider of its own:
 * the page shows through it, and `/shop`'s header gradient runs the full width
 * of the viewport underneath. That is why the shell reserves nothing — padding
 * the frame would push every full-bleed backdrop off the screen edge. Foreground
 * content clears the rail instead, by however much it actually needs, through
 * `.rail-safe-foreground`.
 *
 * Destinations come from the shared registry, so the rail and the mobile bar
 * cannot disagree about where Cart goes. The rail carries one more than the bar:
 * Orders owns its own route here, where there is room, while on mobile Cart has
 * always claimed `/orders` and still does.
 *
 * The account is not among them — it lives once, at the bottom.
 */
export default function BuyerDesktopNav() {
  const pathName = usePathname() ?? "";
  const totalCartItems = useCartCount();

  return (
    <nav
      aria-label="Marketplace"
      className="fixed inset-y-0 start-0 z-sticky hidden w-buyer-rail flex-col items-center justify-between py-6 lg:flex">
      <Tooltip label="Shop">
        <Link href="/shop" aria-label="Vibaar home" className={`rounded-field ${focusRing}`}>
          <BrandLogo shape="mark" width={30} alt="" />
        </Link>
      </Tooltip>

      {/* The destinations sit centred in the column's height, as in the
          reference — the mark and the account anchor the two ends. */}
      <div className="flex flex-col items-center gap-2">
        {navForSurface("desktop").map((link) => {
          const isActive = activeRoutesFor(link, "desktop").some((route) =>
            routeIsActive(pathName, route)
          );
          const isCart = link.id === "cart";

          return (
            <Tooltip key={link.id} label={link.label}>
              <NavItem
                href={link.href}
                icon={
                  <NavGlyph active={isActive} icon={link.Icon} size={24} solid={link.Solid} />
                }
                label={link.label}
                variant="compact-rail"
                active={isActive}
                badge={isCart ? totalCartItems : undefined}
                badgeLabel={isCart ? "items in cart" : undefined}
              />
            </Tooltip>
          );
        })}
      </div>

      <BuyerRailAccount />
    </nav>
  );
}
