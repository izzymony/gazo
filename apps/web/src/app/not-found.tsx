import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Compass01Icon, Home01Icon } from "@hugeicons/core-free-icons";

/**
 * Branded 404 (W4.1) — replaces Next's bare default, rendered inside the root
 * layout with the design tokens + brand.
 */
export default function NotFound() {
  return (
    <div className="min-h-[70vh] w-full flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-instaRed/10 flex items-center justify-center mb-5">
        <HugeiconsIcon icon={Compass01Icon} size={30} color="var(--brand)" />
      </div>
      <p className="text-display font-bold text-ink-90 leading-none mb-1">404</p>
      <h2 className="text-h2 font-semibold text-ink-90 mb-2 text-balance">
        Page not found
      </h2>
      <p className="text-body text-ink-60 mb-6 max-w-xs leading-[20px]">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-instaRed text-white text-body font-medium py-3 px-6 touch-manipulation active:bg-brandHover"
      >
        <HugeiconsIcon icon={Home01Icon} size={18} color="white" />
        Back home
      </Link>
    </div>
  );
}
