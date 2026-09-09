"use client";
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { HelpSquare } from "@vibaar/ui/icons";
import NavItem from "@vibaar/ui/common/NavItem";
import BrandLogo from "@vibaar/ui/common/BrandLogo";
import { supportWhatsAppUrl } from "@/lib/support";
import { SELLER_NAV, activeSellerNav } from "./sellerNav";

export default function DesktopNav() {
  const pathName = usePathname();
  const router = useRouter();
  const activeNavItem = activeSellerNav(pathName);
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  // Clear the spinner once the destination route lands (no global-flag coupling).
  useEffect(() => {
    setLoadingRoute(null);
  }, [pathName]);

  return (
    <nav className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-surface border-r border-outline flex-col py-6 px-4 z-sticky">
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
