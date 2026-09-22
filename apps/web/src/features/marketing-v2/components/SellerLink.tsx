"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSellerDestination } from "@/hooks/useAuthSnapshot";

/**
 * The seller call to action, pointed wherever this visitor actually needs to go.
 *
 * The label does not change. "Start selling" is the page's argument to a
 * stranger, and it stays true for a signed-in seller who has not opened a
 * storefront yet — they land on store creation, which is the thing the words
 * describe. Only the destination varies, so nothing on the page moves when the
 * snapshot resolves after hydration.
 *
 * It exists as its own island so the hero can stay a server component: this is
 * the only part of it that needs to know who is asking.
 */
export default function SellerLink({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const { href } = useSellerDestination();

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}
