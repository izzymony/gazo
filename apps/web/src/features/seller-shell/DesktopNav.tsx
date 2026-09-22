"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import ModeSwitch from "@/design-system/common/ModeSwitch";
import { HelpSquare } from "@vibaar/ui/icons";
import NavItem from "@vibaar/ui/common/NavItem";
import BrandLogo from "@vibaar/ui/common/BrandLogo";
import { supportWhatsAppUrl } from "@/lib/support";
import { SELLER_NAV, activeSellerNav } from "./sellerNav";

export default function DesktopNav() {
  const pathName = usePathname();
  const activeNavItem = activeSellerNav(pathName);
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  // Clear the spinner once the destination route lands (no global-flag coupling).
  useEffect(() => {
    setLoadingRoute(null);
  }, [pathName]);

  return (
    <nav className="hidden lg:flex fixed left-0 top-0 h-screen w-rail bg-surface border-r border-outline flex-col py-6 px-4 z-sticky">
      {/* Logo/Brand */}
      <div className="mb-8 px-3">
        <BrandLogo width={140} className="mb-2" />
        <p className="text-body-sm text-foreground-muted">Dashboard</p>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-1">
        {SELLER_NAV.map(({ title, Icon, route }) => {
          const isActive = activeNavItem === title;
          return (
            <NavItem
              key={title}
              variant="rail"
              href={route}
              icon={<Icon size={20} />}
              label={title}
              showLabel
              active={isActive}
              loading={loadingRoute === route}
              spinnerSize={20}
              disabled={loadingRoute !== null && !isActive && loadingRoute !== route}
              onNavigate={() => {
                if (pathName !== route) setLoadingRoute(route);
              }}
            />
          );
        })}
      </div>

      {/* Bottom Section - Switch to Buyer & Help */}
      <div className="pt-6 border-t border-outline space-y-2">
        {/* The same control as the mobile switch, not a second copy of it. This
            was a duplicate button with the same classes and the same
            white-on-yellow glyph, so fixing one left the other wrong. */}
        <ModeSwitch variant="rail" />

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
