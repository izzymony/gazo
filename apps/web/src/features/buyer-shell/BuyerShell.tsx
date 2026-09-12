"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@vibaar/utils";
import BuyerBottomNav from "./BuyerBottomNav";
import {
  resolveBuyerNav,
  routeNeedsContext,
  type BuyerNavigationPolicy,
} from "./buyerNav";
import { useCartGroupCount, useHasUser } from "./selectors";

/**
 * The buyer route group's frame, and the ONLY place buyer navigation is mounted.
 *
 * It used to be mounted by eight page-level call sites, which is why navigation
 * was present on seven of twenty-six routes and why two pages carried their own
 * visibility conditions. Those conditions did not go away — they moved into the
 * policy, where they can be read and tested in one place.
 *
 * The frame keeps the bounded, positioned, non-scrolling contract it already
 * had: `PageShell`'s `main` is `flex-1 overflow-y-auto` inside `h-full` chains,
 * which only engage against a fixed height, and fourteen buyer surfaces depend
 * on that.
 *
 * It applies NO padding and touches no seller variable. The rail is an overlay,
 * so the page's full-bleed backdrops must still run edge to edge underneath it —
 * padding the frame would push `/shop`'s gradient off the screen edge, which is
 * exactly what the design forbids. Instead the frame carries one marker class,
 * and foreground containers inside it opt into collision-aware clearance.
 */
function BuyerFrame({
  policy,
  children,
}: {
  policy: BuyerNavigationPolicy;
  children: React.ReactNode;
}) {
  const cartGroups = useCartGroupCount();
  const hasUser = useHasUser();

  const showBar =
    policy.mobileBar === "always" ||
    (policy.mobileBar === "when-cart-empty" && cartGroups <= 0) ||
    (policy.mobileBar === "when-user-present" && hasUser);

  return (
    <div
      className={cn(
        "relative h-dvh w-full overflow-hidden",
        policy.desktopRail && "buyer-rail-overlay"
      )}>
      {children}
      {showBar && <BuyerBottomNav />}
    </div>
  );
}

/**
 * Refines the policy for the one route whose answer depends on how you got
 * there. Isolated behind Suspense because `useSearchParams` with no boundary
 * above it deopts the WHOLE route into client-side rendering, and this shell
 * wraps every buyer page — an unguarded read would take all twenty-six off
 * static rendering to answer a question that concerns one.
 */
function ContextualFrame({
  pathName,
  children,
}: {
  pathName: string;
  children: React.ReactNode;
}) {
  const from = useSearchParams()?.get("from");
  return <BuyerFrame policy={resolveBuyerNav(pathName, { from })}>{children}</BuyerFrame>;
}

export default function BuyerShell({ children }: { children: React.ReactNode }) {
  const pathName = usePathname() ?? "";

  // Every other route resolves synchronously from the pathname. Routing them
  // all through the boundary would flash a no-rail fallback on first paint.
  if (!routeNeedsContext(pathName)) {
    return <BuyerFrame policy={resolveBuyerNav(pathName)}>{children}</BuyerFrame>;
  }

  return (
    <Suspense
      fallback={
        // The bare URL is the checkout origin, so no nav is the correct answer
        // while the parameters are unknown.
        <BuyerFrame policy={resolveBuyerNav(pathName)}>{children}</BuyerFrame>
      }>
      <ContextualFrame pathName={pathName}>{children}</ContextualFrame>
    </Suspense>
  );
}
