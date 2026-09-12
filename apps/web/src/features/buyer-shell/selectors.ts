"use client";

import useAuthStore from "@/store/authStore";
import useOrderStore from "@/store/orderStore";

/**
 * The exact state each visibility condition has always tested.
 *
 * These read the same values the page-level conditions did, through selectors
 * so a consumer re-renders on that value rather than on any store change — the
 * bottom bar previously called `useOrderStore()` bare and re-rendered on every
 * order-store write.
 *
 * `carts` and `cart` are NOT interchangeable. `cart` is a flat item list and
 * `carts` is an array of per-business groups (`orderStore.ts`), so
 * `carts.length === 0` is not the same question as "are there zero items".
 * `/cart` has always keyed its bar off the GROUPS, and it must keep doing so:
 * that is what keeps the bar and the page's own checkout footer mutually
 * exclusive rather than stacked.
 */
export const useCartGroupCount = () => useOrderStore((state) => state.carts.length);

/**
 * The badge count — a different question from the one above, deliberately.
 * Every item across both shapes, which is what a shopper expects to see.
 */
export const useCartCount = () =>
  useOrderStore(
    (state) =>
      state.cart.length +
      state.carts.reduce((total, business) => total + business.products.length, 0)
  );

/**
 * `/inbox` keys off the presence of the user OBJECT, not an `isAuthenticated`
 * flag — the flag is persisted to localStorage and can outlive the cookie, so
 * the two can disagree.
 */
export const useHasUser = () => useAuthStore((state) => Boolean(state.user));
